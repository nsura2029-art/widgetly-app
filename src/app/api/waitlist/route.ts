import { NextResponse, type NextRequest } from "next/server";
import { forwardToWebhook, jsonOk, parseJson, withErrorHandling } from "@/lib/api/responses";
import { waitlistRequest, type WaitlistResponse } from "@/lib/api/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { recordWaitlist } from "@/lib/supabase/waitlist";
import { log, maskEmail } from "@/lib/log";

/**
 * POST /api/waitlist
 *
 * Add an email to the launch waitlist. Validates the payload, persists
 * via Supabase (when configured), forwards to the configured webhook
 * (Discord / Slack / Resend / custom) as a best-effort notification,
 * and returns a "you're on the list" envelope with a durable queue
 * position.
 *
 * Persistence order:
 *   1. If Supabase is configured, write to `waitlist` first. The DB is
 *      the source of truth and the position is real. If the DB write
 *      fails, return a 503 — we won't lie to the user with a fake
 *      position number.
 *   2. If Supabase is NOT configured, fall back to a synthetic
 *      position (the existing behavior) and forward to the webhook
 *      as the durable record. This keeps the route working in dev
 *      environments and preview deploys that haven't bound secrets.
 *   3. The webhook forward is always best-effort and never blocks
 *      the success response.
 *
 * Every step is logged to console.log / console.error as a single line
 * of JSON. Watch the `next dev` terminal (or `wrangler tail` in prod)
 * if a submission doesn't reach the DB — the log trail will tell you
 * which step failed.
 *
 * Runtime: edge. Uses Web Crypto + `fetch` only.
 */
export const runtime = "edge";

function shortReqId(): string {
  // 6 chars of base36 is enough to correlate start/end log lines for
  // a single request across the helpers and the route. Lowercase hex
  // would also work; base36 is shorter in print.
  return Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .slice(-6);
}

async function handle(request: NextRequest) {
  const start = Date.now();
  const reqId = shortReqId();
  const userAgent = request.headers.get("user-agent") ?? null;
  const referer = request.headers.get("referer") ?? null;
  const localeHeader = request.headers.get("accept-language") ?? "";
  // "en-US,en;q=0.9,fr;q=0.8" → "en" (first tag, base lang, lowercased)
  const locale = (localeHeader.split(",")[0]?.split(";")[0]?.split("-")[0] || "en").toLowerCase();

  log.info("api.waitlist", "request", {
    req_id: reqId,
    method: request.method,
    content_type: request.headers.get("content-type"),
    accept_lang: localeHeader.slice(0, 60),
    ua_present: Boolean(userAgent),
    referer_present: Boolean(referer),
    cf_ip_present: Boolean(request.headers.get("cf-connecting-ip")),
  });

  let body;
  try {
    body = await parseJson(request, waitlistRequest);
  } catch (e) {
    log.warn("api.waitlist", "validation failed", {
      req_id: reqId,
      err: e instanceof Error ? e.message : "unknown",
      duration_ms: Date.now() - start,
    });
    throw e; // withErrorHandling will turn this into a 400.
  }

  log.info("api.waitlist", "validated", {
    req_id: reqId,
    email: maskEmail(body.email),
    locale,
  });

  const configured = isSupabaseConfigured();
  log.info("api.waitlist", "config check", {
    req_id: reqId,
    supabase_configured: configured,
  });

  // ---- Persistence path: Supabase ----
  if (configured) {
    const result = await recordWaitlist({
      email: body.email,
      locale,
      referrer: referer,
      userAgent,
    });

    if (result.kind === "error") {
      // DB write failed. Don't lie to the user with a fake position;
      // surface a 503 so the client can retry. We still fire the
      // webhook so a human can recover the lead manually.
      log.error("api.waitlist", "db write failed, returning 503", {
        req_id: reqId,
        email: maskEmail(body.email),
        err: result.message,
        duration_ms: Date.now() - start,
      });
      await forwardToWebhook(process.env.WAITLIST_WEBHOOK_URL, {
        type: "widgetly.waitlist.db_fallback",
        submittedAt: new Date().toISOString(),
        error: result.message,
        payload: body,
      });
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "database_unavailable",
            message: "We're having trouble saving your spot. Please try again in a moment.",
          },
        },
        { status: 503 }
      );
    }

    // Notify the configured webhook (Slack/Discord/Resend) in parallel.
    // Best-effort, never blocks the success response.
    void forwardToWebhook(process.env.WAITLIST_WEBHOOK_URL, {
      type: result.kind === "inserted" ? "widgetly.waitlist" : "widgetly.waitlist.resubmit",
      submittedAt: new Date().toISOString(),
      position: result.position,
      payload: body,
    });

    const response: WaitlistResponse = {
      ok: true,
      position: result.position,
      message:
        result.kind === "inserted"
          ? "You're on the list! Check your inbox for confirmation."
          : "You're already on the list — your spot is saved.",
    };
    log.info("api.waitlist", "returning 200", {
      req_id: reqId,
      kind: result.kind,
      position: result.position,
      duration_ms: Date.now() - start,
    });
    return jsonOk(response);
  }

  // ---- Fallback path: webhook-only, synthetic position ----
  log.warn("api.waitlist", "supabase not configured, using fallback", { req_id: reqId });
  await forwardToWebhook(process.env.WAITLIST_WEBHOOK_URL, {
    type: "widgetly.waitlist",
    submittedAt: new Date().toISOString(),
    payload: body,
  });

  const position = Math.floor(8000 + Math.random() * 1500);
  const response: WaitlistResponse = {
    ok: true,
    position,
    message: "You're on the list!",
  };
  log.info("api.waitlist", "returning 200 (fallback)", {
    req_id: reqId,
    position,
    synthetic: true,
    duration_ms: Date.now() - start,
  });
  return jsonOk(response);
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handle(request));
}
