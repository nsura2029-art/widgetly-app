import { z } from "zod";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_URGENCIES,
  type SuggestionCategory,
  type SuggestionUrgency,
} from "@/lib/d1/suggestions";

export const suggestionFormSchema = z
  .object({
    toolName: z
      .string()
      .trim()
      .min(3, "Tool name must be at least 3 characters.")
      .max(50, "Tool name must be 50 characters or fewer."),
    description: z
      .string()
      .trim()
      .min(50, "Description must be at least 50 characters.")
      .max(500, "Description must be 500 characters or fewer."),
    useCase: z
      .string()
      .trim()
      .min(20, "Use case must be at least 20 characters.")
      .max(300, "Use case must be 300 characters or fewer."),
    category: z.enum([...SUGGESTION_CATEGORIES] as [SuggestionCategory, ...SuggestionCategory[]]),
    urgency: z.enum([...SUGGESTION_URGENCIES] as [SuggestionUrgency, ...SuggestionUrgency[]]),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required.")
      .max(254, "Email must be 254 characters or fewer.")
      .email("Please enter a valid email address."),
  })
  .strict();

export type SuggestionFormInput = z.infer<typeof suggestionFormSchema>;

export function validateSuggestionForm(input: unknown) {
  return suggestionFormSchema.safeParse(input);
}
