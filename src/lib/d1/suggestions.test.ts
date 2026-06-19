import { describe, expect, it } from "vitest";
import {
  normalizeCategory,
  normalizeSort,
  normalizeStatus,
  normalizeUrgency,
  slugifySuggestionName,
  suggestionStatusLabel,
} from "./suggestions";

describe("suggestion helpers", () => {
  it("slugifies tool names for shareable URLs", () => {
    expect(slugifySuggestionName("Markdown → PDF!")).toBe("markdown-pdf");
    expect(slugifySuggestionName("  Résumé Builder  ")).toBe("resume-builder");
  });

  it("normalizes legacy statuses into board statuses", () => {
    expect(normalizeStatus("pending_review")).toBe("in_review");
    expect(normalizeStatus("in_development")).toBe("building");
    expect(normalizeStatus("shipped")).toBe("live");
    expect(normalizeStatus("declined")).toBe("rejected");
  });

  it("normalizes categories, urgency, and sort values with safe defaults", () => {
    expect(normalizeCategory("seo")).toBe("SEO");
    expect(normalizeCategory("dev")).toBe("Dev");
    expect(normalizeUrgency("HIGH")).toBe("high");
    expect(normalizeUrgency("later")).toBe("medium");
    expect(normalizeSort("newest")).toBe("newest");
    expect(normalizeSort("unknown")).toBe("most_voted");
  });

  it("returns public status labels", () => {
    expect(suggestionStatusLabel("in_review")).toBe("In Review");
    expect(suggestionStatusLabel("building")).toBe("Building");
    expect(suggestionStatusLabel("live")).toBe("Live");
    expect(suggestionStatusLabel("rejected")).toBe("Rejected");
  });
});
