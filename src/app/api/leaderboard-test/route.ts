import { NextResponse, type NextRequest } from "next/server";
import { getD1, isD1Configured } from "@/lib/d1/server";
import { getFeaturedCreator, getLeaderboard, LEADERBOARD_WINDOWS, normalizeLeaderboardWindow } from "@/lib/d1/leaderboard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const w = normalizeLeaderboardWindow(url.searchParams.get("window"));

    const d1 = isD1Configured();
    let featured: any = null;
    let ranked: any = null;
    let featuredErr: string | null = null;
    let rankedErr: string | null = null;
    try {
      featured = await getFeaturedCreator();
    } catch (e) { featuredErr = e instanceof Error ? e.message : String(e); }
    try {
      ranked = await getLeaderboard(w, 30);
    } catch (e) { rankedErr = e instanceof Error ? e.message : String(e); }

    return NextResponse.json({
      d1_configured: d1,
      window: w,
      featured: featured ? {
        handle: featured.user.handle,
        tools_count: featured.tools.length,
        badges: featured.badges,
      } : null,
      featured_err: featuredErr,
      ranked_count: Array.isArray(ranked) ? ranked.length : "NOT ARRAY",
      ranked_err: rankedErr,
      ranked_sample: Array.isArray(ranked) && ranked[0] ? {
        handle: ranked[0].user.handle,
        contributions: ranked[0].contributions,
      } : null,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
