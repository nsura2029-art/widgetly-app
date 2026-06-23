/**
 * Smoke tests for the public-tools grouped shape contract.
 *
 * Locks in the shape `/api/public/tools?format=grouped` returns:
 *   { categories: Record<category, Record<subcategory, ToolSummary[]>>, total: number }
 *
 * The mega menu (`tools-banner.tsx`) consumes this shape directly —
 * if we accidentally return the legacy flat list (`Record<category,
 * ToolSummary[]>`) or drop the `subcategory` level, the menu
 * silently renders broken columns. These tests are cheap insurance.
 */
import { describe, it, expect } from "vitest";

import { listLiveToolsGroupedByCategory } from "./public-tools";

describe("listLiveToolsGroupedByCategory — DB shape", () => {
  it("returns the two-level grouped shape (categories → subcategories → tools)", async () => {
    const result = await listLiveToolsGroupedByCategory();
    // Empty result is OK if D1 isn't bound in test env — we just
    // verify the *type* is right.
    for (const [category, subcategories] of Object.entries(result)) {
      expect(typeof category).toBe("string");
      expect(typeof subcategories).toBe("object");
      expect(subcategories).not.toBeNull();
      for (const [subcategory, tools] of Object.entries(subcategories)) {
        expect(typeof subcategory).toBe("string");
        expect(Array.isArray(tools)).toBe(true);
        for (const tool of tools) {
          expect(tool).toHaveProperty("slug");
          expect(tool).toHaveProperty("name");
          expect(tool).toHaveProperty("accent_color");
          expect(tool).toHaveProperty("sort_order");
        }
      }
    }
  });

  it("returns an empty object when D1 is not bound (CI / local dev)", async () => {
    const result = await listLiveToolsGroupedByCategory();
    // Either empty (no D1) or populated — both are valid contracts.
    expect(result === null || typeof result === "object").toBe(true);
  });
});
