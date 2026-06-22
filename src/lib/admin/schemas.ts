/**
 * Zod schemas for all admin API inputs.
 *
 * Centralized here so:
 *   - The same validation runs on every route that accepts the shape.
 *   - Adding a new field is a one-file change.
 *   - The runtime check matches the static types in `src/lib/admin/tools.ts`.
 *
 * Each export is a `z.ZodType` that can be used with `.parse()` (throws
 * on failure) or `.safeParse()` (returns a discriminated result). All
 * the API routes use safeParse and translate the ZodError into a 400
 * with a stable `{ error, issues }` payload.
 */
import { z } from "zod";

// Status enum mirrors the CHECK constraints on admin_tools.status.
const TOOL_STATUS = z.enum([
  "suggested",
  "under_review",
  "in_progress",
  "live",
  "deprecated",
  "rejected",
]);

const PRICING_TIER = z.enum(["free", "freemium", "paid"]);
const ACCENT_COLOR = z.enum(["primary", "secondary", "accent"]);

// Slug rule: lowercase letters, digits, and hyphens, 1-60 chars.
const SLUG = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Slug must be lowercase letters, digits, and hyphens");

const CATEGORY = z.string().min(1).max(60);

// Short, human-friendly URL strings. Empty string → null in DB.
const OPTIONAL_URL = z
  .string()
  .max(500)
  .transform((v) => (v.trim() === "" ? null : v));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const LoginBody = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});
export type LoginBody = z.infer<typeof LoginBody>;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const ToolBaseFields = {
  slug: SLUG,
  category: CATEGORY,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(280).default(""),
  long_description: z.string().max(4000).default(""),
  api_endpoint: OPTIONAL_URL.optional(),
  pricing_tier: PRICING_TIER.default("free"),
  icon_url: OPTIONAL_URL.optional(),
  accent_color: ACCENT_COLOR.default("primary"),
  sort_order: z.number().int().min(0).max(10000).default(100),
  notes: z.string().max(2000).default(""),
};

/** POST /api/admin/tools body — every field is required for a new row. */
export const CreateToolBody = z.object({
  ...ToolBaseFields,
  status: TOOL_STATUS.default("suggested"),
});
export type CreateToolBody = z.infer<typeof CreateToolBody>;

/** PATCH /api/admin/tools/[id] body — every field is optional. */
export const UpdateToolBody = z
  .object({
    ...Object.fromEntries(Object.entries(ToolBaseFields).map(([k, v]) => [k, v.optional()])),
    status: TOOL_STATUS.optional(),
  })
  .strict();
export type UpdateToolBody = z.infer<typeof UpdateToolBody>;

/** List query string. */
export const ListToolsQuery = z.object({
  status: z.union([TOOL_STATUS, z.literal("all")]).default("all"),
  category: z.string().default("all"),
  q: z.string().default(""),
  sort: z
    .enum(["updated_desc", "updated_asc", "name_asc", "name_desc", "sort_asc", "live_first"])
    .default("live_first"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
});
export type ListToolsQuery = z.infer<typeof ListToolsQuery>;

/** Path param for /api/admin/tools/[id]. */
export const ToolIdParam = z.object({
  id: z.coerce.number().int().positive(),
});
export type ToolIdParam = z.infer<typeof ToolIdParam>;
