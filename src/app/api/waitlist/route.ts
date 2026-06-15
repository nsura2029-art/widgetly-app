import { NextResponse, type NextRequest } from "next/server";
import { forwardToWebhook, jsonOk, parseJson, withErrorHandling } from "@/lib/api/responses";
import { waitlistRequest, type WaitlistResponse } from "@/lib/api/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { recordWaitlist } from "@/lib/supabase/waitlist";

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
 * Runtime: edge. Uses Web Crypto + `fetch` only.
 */
export const runtime = "edge";

async function handle(request: NextRequest) {
  const body = await parseJson(request, waitlistRequest);

  const userAgent = request.headers.get("user-agent") ?? null;
  const referer = request.headers.get("referer") ?? null;
  const localeHeader = request.headers.get("accept-language") ?? "";
  // "en-US,en;q=0.9,fr;q=0.8" → "en" (first tag, base lang, lowercased)
  const locale = (localeHeader.split(",")[0]?.split(";")[0]?.split("-")[0] || "en").toLowerCase();

  // ---- Persistence path: Supabase ----
  if (isSupabaseConfigured()) {
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
    return jsonOk(response);
  }

  // ---- Fallback path: webhook-only, synthetic position ----
  // Keeps the route working when Supabase isn't configured yet
  // (preview deploys, local dev without secrets, mid-setup).
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
  return jsonOk(response);
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handle(request));
}
