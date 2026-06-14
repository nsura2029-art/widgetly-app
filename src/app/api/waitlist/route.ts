import type { NextRequest } from "next/server";
import { forwardToWebhook, jsonOk, parseJson, withErrorHandling } from "@/lib/api/responses";
import { waitlistRequest, type WaitlistResponse } from "@/lib/api/schemas";

/**
 * POST /api/waitlist
 *
 * Add an email to the launch waitlist. Validates the payload,
 * forwards to the configured webhook, and returns a "you're on
 * the list" envelope with a synthetic queue position. Replace
 * the position logic with a Cloudflare KV counter when the
 * namespace is bound.
 *
 * Runtime: edge. Web Crypto + `fetch` only.
 */
export const runtime = "edge";

async function handle(request: NextRequest) {
  const body = await parseJson(request, waitlistRequest);

  // Forward first, then return. The receiver (e.g. Resend, a CRM,
  // a Discord webhook) is the durable record for now. When the
  // KV binding is added, replace this with a KV write and use the
  // KV counter for the position.
  await forwardToWebhook(process.env.WAITLIST_WEBHOOK_URL, {
    type: "widgetly.waitlist",
    submittedAt: new Date().toISOString(),
    payload: body,
  });

  // Synthetic position — replaced by a Cloudflare KV counter when
  // the WAITLIST KV binding is configured (see wrangler.toml).
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
