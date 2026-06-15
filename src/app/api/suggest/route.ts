import { NextResponse, type NextRequest } from "next/server";
import {
  forwardToWebhook,
  generateId,
  jsonOk,
  jsonError,
  parseJson,
  withErrorHandling,
} from "@/lib/api/responses";
import { suggestRequest, type SuggestResponse } from "@/lib/api/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { recordSuggestion } from "@/lib/supabase/suggestions";
import { log } from "@/lib/log";

/**
 * POST /api/suggest
 *
 * Submit a tool suggestion. Validates the payload, mints a server id
 * and a URL slug for the eventual public page, persists via Supabase
 * (when configured), forwards to a configured webhook (Discord / Slack
 * / Resend / custom) as a best-effort notification, and returns the
 * suggestion envelope.
 *
 * Persistence order is the same shape as `/api/waitlist`:
 *   1. If Supabase is configured, write first. The DB is the source
 *      of truth. On DB failure, return 503 — don't pretend the
 *      suggestion was queued.
 *   2. If not, fall back to webhook-only with a server-minted id+slug.
 *      Same durable result for the user, no DB involved.
 *   3. Webhook is best-effort, never blocks.
 *
 * Runtime: edge. Uses Web Crypto for the id and the standard `fetch`
 * for the webhook + Supabase HTTP API. No Node-only APIs.
 */
export const runtime = "edge";

function shortReqId(): string {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .slice(-6);
}

async function handle(request: NextRequest) {
  const start = Date.now();
  const reqId = shortReqId();

  log.info("api.suggest", "request", {
    req_id: reqId,
    method: request.method,
    content_type: request.headers.get("content-type"),
    ua_present: Boolean(request.headers.get("user-agent")),
  });

  let body;
  try {
    body = await parseJson(request, suggestRequest);
  } catch (e) {
    log.warn("api.suggest", "validation failed", {
      req_id: reqId,
      err: e instanceof Error ? e.message : "unknown",
      duration_ms: Date.now() - start,
    });
    throw e;
  }

  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const id = generateId("sg");

  const localeHeader = request.headers.get("accept-language") ?? "";
  const locale = (localeHeader.split(",")[0]?.split(";")[0]?.split("-")[0] || "en").toLowerCase();

  log.info("api.suggest", "validated", {
    req_id: reqId,
    id,
    slug,
    name_len: body.name.length,
    desc_len: body.description.length,
    locale,
  });

  const configured = isSupabaseConfigured();
  log.info("api.suggest", "config check", {
    req_id: reqId,
    supabase_configured: configured,
  });

  // ---- Persistence path: Supabase ----
  if (configured) {
    const result = await recordSuggestion({
      id,
      slug,
      name: body.name,
      pitch: body.description,
      contact: body.email || null,
      locale,
    });

    if (result.kind === "inserted") {
      void forwardToWebhook(process.env.SUGGEST_WEBHOOK_URL, {
        type: "widgetly.suggest",
        id: result.id,
        slug: result.slug,
        status: "pending_review",
        submittedAt: result.createdAt,
        payload: body,
      });

      const response: SuggestResponse = {
        ok: true,
        id: result.id,
        slug: result.slug,
        status: "pending_review",
        message: "Got it — your idea is in the queue. We'll review it within one business day.",
      };
      log.info("api.suggest", "returning 200", {
        req_id: reqId,
        id: result.id,
        duration_ms: Date.now() - start,
      });
      return jsonOk(response);
    }

    if (result.kind === "duplicate_slug") {
      log.warn("api.suggest", "duplicate slug, returning 409", {
        req_id: reqId,
        slug,
        duration_ms: Date.now() - start,
      });
      // Surface a 409 with a stable code so the client can offer
      // "this name is already taken — try rephrasing".
      return jsonError(
        409,
        "duplicate_slug",
        "A tool with this name has already been suggested. Try a more specific name."
      );
    }

    // DB error. Forward to webhook for manual recovery, return 503.
    log.error("api.suggest", "db write failed, returning 503", {
      req_id: reqId,
      err: result.message,
      duration_ms: Date.now() - start,
    });
    await forwardToWebhook(process.env.SUGGEST_WEBHOOK_URL, {
      type: "widgetly.suggest.db_fallback",
      submittedAt: new Date().toISOString(),
      error: result.message,
      payload: body,
      attempted: { id, slug },
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "database_unavailable",
          message: "We're having trouble saving your suggestion. Please try again in a moment.",
        },
      },
      { status: 503 }
    );
  }

  // ---- Fallback path: webhook-only ----
  log.warn("api.suggest", "supabase not configured, using fallback", { req_id: reqId });
  await forwardToWebhook(process.env.SUGGEST_WEBHOOK_URL, {
    type: "widgetly.suggest",
    id,
    slug,
    status: "pending_review",
    submittedAt: new Date().toISOString(),
    payload: body,
  });

  const response: SuggestResponse = {
    ok: true,
    id,
    slug: slug || `suggestion-${id}`,
    status: "pending_review",
    message: "Got it — your idea is in the queue. We'll review it within one business day.",
  };
  log.info("api.suggest", "returning 200 (fallback)", {
    req_id: reqId,
    id,
    duration_ms: Date.now() - start,
  });
  return jsonOk(response);
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handle(request));
}
