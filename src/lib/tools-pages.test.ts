/**
 * Tests for `getToolPageOrPlaceholder` and `isLikelyValidToolSlug`.
 *
 * These guard the route /tools/[category]/[tool] from 404-ing when
 * the admin panel adds a tool to D1 with a slug that the static
 * catalog doesn't know about. Without the placeholder, the
 * [tool] page handler would call notFound() and the live DB tools
 * would be unreachable from the menu.
 */
import { describe, it, expect } from "vitest";

import {
  getAllToolPages,
  getToolPage,
  getToolPageOrPlaceholder,
  getToolPagesInCategory,
  isLikelyValidToolSlug,
  toolDescription,
  toolKeywords,
  toolSlug,
} from "./tools-pages";

describe("toolSlug", () => {
  it("lowercases, hyphenates, and trims", () => {
    expect(toolSlug("Merge PDF")).toBe("merge-pdf");
    expect(toolSlug("  Image Resizer  ")).toBe("image-resizer");
    expect(toolSlug("PDF → Word")).toBe("pdf-word");
    expect(toolSlug("BMI Calculator")).toBe("bmi-calculator");
  });

  it("strips non-alphanumerics", () => {
    expect(toolSlug("URL?")).toBe("url");
    expect(toolSlug("Foo & Bar")).toBe("foo-bar");
  });
});

describe("getToolPage / getAllToolPages", () => {
  it("returns the static page for a known (category, slug)", () => {
    const all = getAllToolPages();
    expect(all.length).toBeGreaterThan(0);
    // Pick the first entry — it should be self-resolvable.
    const first = all[0]!;
    const found = getToolPage(first.categorySlug, first.slug);
    expect(found).toBeDefined();
    expect(found?.name).toBe(first.name);
  });

  it("returns undefined for an unknown slug in a known category", () => {
    expect(getToolPage("pdf", "definitely-not-a-real-tool-12345")).toBeUndefined();
  });

  it("returns undefined for an unknown category", () => {
    expect(getToolPage("not-a-category", "anything")).toBeUndefined();
  });

  it("every page has a pre-resolved Icon component", () => {
    for (const p of getAllToolPages()) {
      expect(p.Icon).toBeDefined();
      expect(typeof p.Icon).toBe("object"); // forwardRef components
    }
  });
});

describe("getToolPagesInCategory", () => {
  it("filters by category", () => {
    const pdf = getToolPagesInCategory("pdf");
    expect(pdf.length).toBeGreaterThan(0);
    for (const p of pdf) expect(p.categorySlug).toBe("pdf");
  });

  it("returns an empty array for an unknown category", () => {
    expect(getToolPagesInCategory("nope")).toEqual([]);
  });
});

describe("isLikelyValidToolSlug", () => {
  it("accepts the canonical slug pattern", () => {
    expect(isLikelyValidToolSlug("merge-pdf")).toBe(true);
    expect(isLikelyValidToolSlug("image")).toBe(true);
    expect(isLikelyValidToolSlug("a1-b2-c3")).toBe(true);
  });

  it("rejects slugs with spaces, punctuation, or empty", () => {
    expect(isLikelyValidToolSlug("")).toBe(false);
    expect(isLikelyValidToolSlug("Merge PDF")).toBe(false);
    expect(isLikelyValidToolSlug("merge_pdf")).toBe(false);
    expect(isLikelyValidToolSlug("merge--pdf")).toBe(false);
    expect(isLikelyValidToolSlug("-leading-hyphen")).toBe(false);
    expect(isLikelyValidToolSlug("trailing-hyphen-")).toBe(false);
    expect(isLikelyValidToolSlug("anything..")).toBe(false);
    expect(isLikelyValidToolSlug("foo/bar")).toBe(false);
  });
});

describe("getToolPageOrPlaceholder", () => {
  it("returns the static page when known", () => {
    const all = getAllToolPages();
    const first = all[0]!;
    const got = getToolPageOrPlaceholder(first.categorySlug, first.slug);
    expect(got?.slug).toBe(first.slug);
    expect(got?.name).toBe(first.name);
    // No "placeholder" path means we got the rich entry, not a
    // synthesized one. (We can't introspect that directly, but the
    // icon should match the static one.)
    expect(got?.icon).toBe(first.icon);
  });

  it("synthesizes a placeholder for a DB-only slug in a known category", () => {
    const got = getToolPageOrPlaceholder("pdf", "totally-new-admin-tool");
    expect(got).toBeDefined();
    expect(got?.categorySlug).toBe("pdf");
    expect(got?.slug).toBe("totally-new-admin-tool");
    // Display name is title-cased from the slug.
    expect(got?.name).toBe("Totally New Admin Tool");
    // Icon is the category icon (PDF has FileText).
    expect(got?.icon).toBe("FileText");
    expect(got?.Icon).toBeDefined();
  });

  it("returns undefined for an unknown category", () => {
    expect(getToolPageOrPlaceholder("not-a-real-category", "anything")).toBeUndefined();
  });

  it("placeholder uses the slug as the name when the slug has no hyphens", () => {
    const got = getToolPageOrPlaceholder("pdf", "flat");
    expect(got?.name).toBe("Flat");
  });

  it("placeholder name preserves original slug casing when there's only one word", () => {
    const got = getToolPageOrPlaceholder("image", "crop");
    expect(got?.name).toBe("Crop");
  });
});

describe("toolDescription", () => {
  it("includes the tool name and a primary keyword", () => {
    const all = getAllToolPages();
    const first = all[0]!;
    const desc = toolDescription(first);
    expect(desc.length).toBeGreaterThan(20);
    expect(desc.toLowerCase()).toContain(first.name.toLowerCase());
  });
});

describe("toolKeywords", () => {
  it("includes the tool name lowercased plus category keywords", () => {
    const all = getAllToolPages();
    const first = all[0]!;
    const kws = toolKeywords(first);
    expect(kws).toContain(first.name.toLowerCase());
    expect(kws.some((k) => k.includes("online"))).toBe(true);
  });
});
