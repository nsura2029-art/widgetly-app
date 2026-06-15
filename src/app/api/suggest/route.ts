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

async function handle(request: NextRequest) {
  const body = await parseJson(request, suggestRequest);
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const id = generateId("sg");

  const localeHeader = request.headers.get("accept-language") ?? "";
  const locale = (localeHeader.split(",")[0]?.split(";")[0]?.split("-")[0] || "en").toLowerCase();

  // ---- Persistence path: Supabase ----
  if (isSupabaseConfigured()) {
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
      return jsonOk(response);
    }

    if (result.kind === "duplicate_slug") {
      // Surface a 409 with a stable code so the client can offer
      // "this name is already taken — try rephrasing".
      return jsonError(
        409,
        "duplicate_slug",
        "A tool with this name has already been suggested. Try a more specific name."
      );
    }

    // DB error. Forward to webhook for manual recovery, return 503.
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
  return jsonOk(response);
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handle(request));
}
