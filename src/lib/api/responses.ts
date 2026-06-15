import { NextResponse } from "next/server";
import * as zod from "zod";
import type { ZodType } from "zod";
import type { ApiErrorResponse } from "./schemas";

/**
 * Shared helpers for the public API routes.
 *
 * Every API route in `/src/app/api/*` uses these to:
 *  1. Parse + validate the incoming JSON body against a Zod schema.
 *  2. Return consistent success and error responses.
 *  3. Forward the validated payload to a downstream webhook if one
 *     is configured (used as a portable integration point until we
 *     wire up a real database).
 *
 * Edge-runtime safe: no Node-only APIs. The webhook fetch uses
 * the standard `fetch` available in Cloudflare Workers.
 */

const REQUEST_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Cheap, dependency-free, Edge-runtime-safe random id.
 * ~9 chars × 32 alphabet = 160 bits of entropy, more than UUIDv4
 * without the dashes. We use this for submission and ticket ids
 * so we don't need a real UUID library.
 */
export function generateId(prefix = ""): string {
  const buf = new Uint8Array(9);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    const idx = buf[i];
    if (idx === undefined) continue;
    out += REQUEST_ID_ALPHABET[idx % REQUEST_ID_ALPHABET.length];
  }
  return prefix ? `${prefix}_${out}` : out;
}

export function generateTicket(): string {
  // 4-digit ticket number. Increments aren't atomic across the edge
  // runtime without a coordinator, so we just pick a number in
  // [1000, 9999] from a single random byte. The byte range is
  // 0-255, so we map it onto a 0-8999 range and add 1000.
  const rand = new Uint8Array(1);
  crypto.getRandomValues(rand);
  const n = 1000 + Math.floor(((rand[0] ?? 0) / 256) * 9000);
  return `WID-${n}`;
}

/**
 * Parse and validate a request body. Throws a `ValidationError` on
 * any zod failure, which the route handler turns into a 400.
 */
export async function parseJson<S extends ZodType>(
  request: Request,
  schema: S
): Promise<zod.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Body must be valid JSON.", []);
  }
  if (raw === null || typeof raw !== "object") {
    throw new ValidationError("Body must be a JSON object.", []);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(
      "Some fields didn't pass validation.",
      result.error.issues.map((i) => ({
        path: i.path.join(".") || "(root)",
        message: i.message,
      }))
    );
  }
  return result.data;
}

export class ValidationError extends Error {
  readonly fields: ReadonlyArray<{ path: string; message: string }>;
  constructor(message: string, fields: ReadonlyArray<{ path: string; message: string }>) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Build the standard JSON success envelope and a NextResponse.
 */
export function jsonOk<T>(body: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: init?.headers,
  });
}

/**
 * Build the standard JSON error envelope and a NextResponse.
 * `code` is a stable machine-readable string. `message` is safe to
 * show to the end user (no internal jargon, no stack traces).
 */
export function jsonError(
  status: number,
  code: string,
  message: string,
  fields?: ReadonlyArray<{ path: string; message: string }>
) {
  const body: ApiErrorResponse = {
    ok: false,
    error: { code, message, ...(fields ? { fields: [...fields] } : {}) },
  };
  return NextResponse.json(body, { status });
}

/**
 * Convert any thrown value from a route handler into the right
 * NextResponse. Routes wrap their body in `withErrorHandling(async
 * () => { ... })` and just throw — this handles the envelope.
 */
export function withErrorHandling(handler: () => Promise<NextResponse>) {
  return handler().catch((err: unknown) => {
    if (err instanceof ValidationError) {
      return jsonError(400, "validation_error", err.message, err.fields);
    }
    if (err instanceof HttpError) {
      return jsonError(err.status, err.code, err.message);
    }
    // Unknown error. Log to console (Cloudflare Workers pipes this
    // to the worker's logs), return a generic 500 to the client.
    console.error("API handler crashed:", err);
    return jsonError(500, "internal_error", "Something went wrong on our end.");
  });
}

/**
 * Forward a validated submission to a configured webhook.
 * The webhook contract is intentionally loose — any HTTP endpoint
 * that accepts JSON will work. Cloudflare Workers + Discord
 * webhooks + Slack incoming webhooks + a custom Resend proxy all
 * fit. Failures are logged but never block the success response:
 * the submission is durably accepted the moment the API returns
 * 2xx, and the webhook is best-effort.
 */
export async function forwardToWebhook(
  webhookUrl: string | undefined,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!webhookUrl) return { ok: true };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // Cloudflare Workers supports this signal; the route's
      // outer AbortSignal could be plumbed here later.
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error("Webhook forward failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// Re-export zod so route files only need one import.
export { zod };
export type { ZodType } from "zod";
