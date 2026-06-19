import { describe, expect, it } from "vitest";
import { validateSuggestionForm } from "./validation";

const validInput = {
  toolName: "PDF Summarizer",
  description:
    "Summarize long PDF files into a concise, accurate list of key points and action items.",
  useCase: "Researchers can understand dense documents before deciding what to read fully.",
  category: "PDF",
  urgency: "high",
  email: "reader@example.com",
};

describe("validateSuggestionForm", () => {
  it("accepts a complete valid suggestion", () => {
    const result = validateSuggestionForm(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects short required text fields", () => {
    const result = validateSuggestionForm({
      ...validInput,
      toolName: "AI",
      description: "Too short.",
      useCase: "Short.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["toolName", "description", "useCase"])
      );
    }
  });

  it("requires a valid notification email", () => {
    const result = validateSuggestionForm({ ...validInput, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join(".")).toBe("email");
    }
  });
});
