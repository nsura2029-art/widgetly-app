import type { NextRequest } from "next/server";
import {
  forwardToWebhook,
  generateId,
  jsonOk,
  parseJson,
  withErrorHandling,
} from "@/lib/api/responses";
import { suggestRequest, type SuggestResponse } from "@/lib/api/schemas";

/**
 * POST /api/suggest
 *
 * Submit a tool suggestion. Validates the payload, mints a server
 * id and a URL slug for the eventual public page, optionally
 * forwards to a configured webhook (Discord / Slack / Resend /
 * custom), and returns the suggestion envelope.
 *
 * Persistence: today, the webhook is the durable record. The
 * `id` we mint is included in the webhook payload so the receiver
 * can dedupe. When a database is wired up (D1 / Workers KV / an
 * external one), the route's only addition is a write call before
 * the webhook forward.
 *
 * Runtime: edge. Uses Web Crypto for the id and the standard
 * `fetch` for the webhook. No Node-only APIs.
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

  // Webhook payload is a superset of what the client sent — we
  // include the server-minted id and slug so the receiver can
  // dedupe and link to the future public page.
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
