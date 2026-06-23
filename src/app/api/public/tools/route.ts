/**
 * GET /api/public/tools
 *
 * Public API: returns only tools with `status='live'`. No auth.
 *
 * Query params:
 *   category   — filter by category slug (default: all categories)
 *   limit      — max results (1-500, default 200)
 *   format     — "json" (default) | "jsonl" | "count" — JSON Lines for streaming, count for a single integer
 *
 * Response shape:
 *   - format=json:    { tools: PublicTool[], total: number, category?: string }
 *   - format=jsonl:   one JSON object per line (newline-delimited)
 *   - format=count:   { category: string, count: number }
 *
 * The route reads from D1 admin_tools via src/lib/d1/public-tools.ts.
 * If D1 isn't bound or the table is empty, returns an empty list
 * (the static catalog in /tools/[category] remains the source of
 * truth for SEO until the admin pipeline is populated).
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  getLiveToolCountsByCategory,
  getLiveToolsForCategoryPublic,
  listLiveToolsGroupedByCategory,
  type PublicTool,
} from "@/lib/d1/public-tools";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.trim() || null;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "200") || 200, 1), 500);
  const format = url.searchParams.get("format") ?? "json";

  try {
    if (category) {
      const tools = (await getLiveToolsForCategoryPublic(category)).slice(0, limit);
      if (format === "jsonl") {
        return jsonlResponse(tools);
      }
      if (format === "count") {
        return NextResponse.json({ category, count: tools.length });
      }
      return NextResponse.json({ tools, total: tools.length, category });
    }

    // No category filter.
    if (format === "grouped") {
      // Two-level grouping for the header mega-menu. Each category
      // is a map of subcategory → LiveToolSummary[], so the menu
      // can render Category → Subcategory → Tool directly without
      // a client-side flatten.
      //
      // 10s s-maxage matches the per-route cache policy on
      // /tools/[category] so admin status changes propagate on the
      // same ~10s window everywhere.
      const categories = await listLiveToolsGroupedByCategory();
      let total = 0;
      for (const subs of Object.values(categories)) {
        for (const tools of Object.values(subs)) total += tools.length;
      }
      return NextResponse.json(
        { categories, total },
        { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=86400" } }
      );
    }
    // All-categories: aggregate per-category counts (cheaper than the
    // full list when callers just want badges/numbers).
    const counts = await getLiveToolCountsByCategory();
    if (format === "jsonl") {
      return jsonlResponse(Object.entries(counts).map(([cat, n]) => ({ category: cat, count: n })));
    }
    return NextResponse.json({ counts, total: Object.values(counts).reduce((a, b) => a + b, 0) });
  } catch (err) {
    log.error("public.tools.api.failed", "public-tools-failed", {
      error: (err as Error).message,
    });
    return NextResponse.json({ tools: [], total: 0, error: "internal" }, { status: 500 });
  }
}

function jsonlResponse(rows: ReadonlyArray<PublicTool | Record<string, unknown>>): Response {
  const body = rows.map((r) => JSON.stringify(r)).join("\n");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}
