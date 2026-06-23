import { z } from "zod";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_URGENCIES,
  type SuggestionCategory,
  type SuggestionUrgency,
} from "@/lib/d1/suggestions";

/**
 * Stable, locale-independent error codes. The form layer translates these
 * via `useTranslations("suggest.formNew.errors")` so the same schema
 * works server-side (API routes) and client-side (the suggestion form).
 *
 * Adding a new validation rule? Add a new code here and a matching key
 * under `suggest.formNew.errors.<code>` in en.json / es.json / fr.json.
 */
export const SUGGESTION_ERROR_CODES = {
  toolNameMin: "toolNameMin",
  toolNameMax: "toolNameMax",
  descriptionMin: "descriptionMin",
  descriptionMax: "descriptionMax",
  useCaseMin: "useCaseMin",
  useCaseMax: "useCaseMax",
  categoryRequired: "categoryRequired",
  emailRequired: "emailRequired",
  emailMax: "emailMax",
  emailInvalid: "emailInvalid",
} as const;

export type SuggestionErrorCode =
  (typeof SUGGESTION_ERROR_CODES)[keyof typeof SUGGESTION_ERROR_CODES];

export const suggestionFormSchema = z
  .object({
    toolName: z
      .string()
      .trim()
      .min(3, SUGGESTION_ERROR_CODES.toolNameMin)
      .max(50, SUGGESTION_ERROR_CODES.toolNameMax),
    description: z
      .string()
      .trim()
      .min(50, SUGGESTION_ERROR_CODES.descriptionMin)
      .max(500, SUGGESTION_ERROR_CODES.descriptionMax),
    useCase: z
      .string()
      .trim()
      .min(20, SUGGESTION_ERROR_CODES.useCaseMin)
      .max(300, SUGGESTION_ERROR_CODES.useCaseMax),
    // Category is required: an empty string (the "Select a category"
    // placeholder value) is rejected. The "Other" option in the
    // select is a real, valid bucket for tools that don't fit the
    // other 11 defined categories.
    //
    // We use `.string().refine(...)` rather than `.enum().refine(...)`
    // so the empty-string check fires first and returns our localized
    // `categoryRequired` code. With `.enum().refine()`, Zod's enum
    // validation runs first and emits its own generic "Invalid enum
    // value" message for an empty string, bypassing the refine.
    category: z
      .string()
      .refine(
        (value): value is SuggestionCategory =>
          (SUGGESTION_CATEGORIES as readonly string[]).includes(value),
        { message: SUGGESTION_ERROR_CODES.categoryRequired }
      ),
    urgency: z.enum([...SUGGESTION_URGENCIES] as [SuggestionUrgency, ...SuggestionUrgency[]]),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, SUGGESTION_ERROR_CODES.emailRequired)
      .max(254, SUGGESTION_ERROR_CODES.emailMax)
      .email(SUGGESTION_ERROR_CODES.emailInvalid),
  })
  .strict();

export type SuggestionFormInput = z.infer<typeof suggestionFormSchema>;

export function validateSuggestionForm(input: unknown) {
  return suggestionFormSchema.safeParse(input);
}
