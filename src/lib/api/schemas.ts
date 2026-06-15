import { z } from "zod";

/**
 * Shared request / response schemas for the Widgetly public API.
 *
 * These are Zod schemas, which serve two purposes:
 *  1. Runtime validation of inbound `request.json()` payloads in
 *     the route handlers.
 *  2. Source of truth for the OpenAPI spec — we hand-mirror the
 *     shapes into `openapi.ts` so the Swagger UI docs and the
 *     actual validation never drift.
 *
 * The schemas are deliberately small and strict. Don't relax the
 * email regex, don't accept unknown fields (`strict()`), and don't
 * add a "catch-all" error handler that hides field-level validation
 * problems — the API returns a 400 with a per-field breakdown so
 * the client forms can show specific guidance.
 */

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Please enter a valid email address.");

const shortText = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `Must be at least ${min} character${min === 1 ? "" : "s"}.`)
    .max(max, `Must be at most ${max} characters.`);

const longText = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min, `Must be at least ${min} character${min === 1 ? "" : "s"}.`)
    .max(max, `Must be at most ${max} characters.`);

// ----- /api/waitlist -----

export const waitlistRequest = z
  .object({
    email: emailField,
    /**
     * Where the user came from. Optional but useful for attribution.
     * Restricted to a small allowlist to prevent header injection
     * if the value ever ends up in a log line.
     */
    source: z.enum(["home", "footer", "blog", "tools", "other"]).optional().default("other"),
  })
  .strict();

export type WaitlistRequest = z.infer<typeof waitlistRequest>;

export const waitlistResponse = z.object({
  ok: z.literal(true),
  position: z.number().int().nonnegative(),
  message: z.string(),
});

export type WaitlistResponse = z.infer<typeof waitlistResponse>;

// ----- /api/suggest -----

export const suggestRequest = z
  .object({
    /** Name of the tool the user wants built. */
    name: shortText(80),
    /** What the tool does and why it's useful. */
    description: longText(2000),
    /** Free-form category label. Optional. */
    category: shortText(40).optional(),
    /** Follow-up email. Optional. We never share it. */
    email: emailField.optional().or(z.literal("")),
    /** Where the submission came from. */
    source: z.enum(["form", "homepage_widget", "footer", "other"]).optional().default("form"),
    /**
     * Client-generated idempotency key. If the same id is posted
     * twice, the API returns the same response without creating a
     * duplicate. Optional. Most clients will skip this.
     */
    idempotencyKey: z
      .string()
      .trim()
      .min(8)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, "Idempotency key must be URL-safe.")
      .optional(),
  })
  .strict();

export type SuggestRequest = z.infer<typeof suggestRequest>;

export const suggestResponse = z.object({
  ok: z.literal(true),
  /** Server-side ID for the submission. */
  id: z.string().min(1),
  /** Slug for the public suggestion page (e.g. "pdf-summarizer"). */
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens."),
  /** Status — "pending_review" until we triage it. */
  status: z.enum(["pending_review", "in_queue", "duplicate"]),
  message: z.string(),
});

export type SuggestResponse = z.infer<typeof suggestResponse>;

// ----- /api/contact -----

export const contactRequest = z
  .object({
    name: shortText(80),
    email: emailField,
    message: longText(2000, 10),
    /** Optional reference to where the user came from. */
    referrer: z
      .string()
      .trim()
      .max(2048)
      .url("Referrer must be a valid URL.")
      .optional()
      .or(z.literal("")),
  })
  .strict();

export type ContactRequest = z.infer<typeof contactRequest>;

export const contactResponse = z.object({
  ok: z.literal(true),
  /** Server-side ID for the message. */
  id: z.string().min(1),
  /** Ticket number formatted for display, e.g. "WID-1042". */
  ticket: z.string().min(1),
  message: z.string(),
});

export type ContactResponse = z.infer<typeof contactResponse>;

// ----- shared error envelope -----

export const apiErrorResponse = z.object({
  ok: z.literal(false),
  error: z.object({
    /** Stable machine-readable code, e.g. "invalid_email". */
    code: z.string(),
    /** Human-readable message safe to show to end users. */
    message: z.string(),
    /** Per-field validation errors when `code === "validation_error"`. */
    fields: z
      .array(
        z.object({
          /** Field path, dot-notation for nested fields. */
          path: z.string(),
          message: z.string(),
        })
      )
      .optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponse>;
