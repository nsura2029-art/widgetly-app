import type { NextRequest } from "next/server";
import {
  forwardToWebhook,
  generateId,
  generateTicket,
  jsonOk,
  parseJson,
  withErrorHandling,
} from "@/lib/api/responses";
import { contactRequest, type ContactResponse } from "@/lib/api/schemas";

/**
 * POST /api/contact
 *
 * Receive a contact-form message. Validates the payload, mints a
 * ticket number, forwards to the configured webhook, and returns
 * the confirmation envelope.
 *
 * Runtime: edge. Web Crypto + `fetch` only.
 */
export const runtime = "edge";

async function handle(request: NextRequest) {
  const body = await parseJson(request, contactRequest);
  const id = generateId("ct");
  const ticket = generateTicket();

  await forwardToWebhook(process.env.CONTACT_WEBHOOK_URL, {
    type: "widgetly.contact",
    id,
    ticket,
    submittedAt: new Date().toISOString(),
    payload: body,
  });

  const response: ContactResponse = {
    ok: true,
    id,
    ticket,
    message: `Thanks — your message is in. We'll reply within one business day.`,
  };
  return jsonOk(response);
}

export async function POST(request: NextRequest) {
  return withErrorHandling(() => handle(request));
}
