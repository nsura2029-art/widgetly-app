import { NextResponse, type NextRequest } from "next/server";
import { getD1 } from "@/lib/d1/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const db = getD1();
    const users = await db.prepare("SELECT COUNT(*) as c FROM users").first();
    const contribs = await db.prepare("SELECT COUNT(*) as c FROM contributions").first();
    const badges = await db.prepare("SELECT COUNT(*) as c FROM badges").first();
    const sample = await db.prepare("SELECT handle, display_name FROM users LIMIT 3").all();
    const contributions_sample = await db.prepare("SELECT tool_slug, category FROM contributions LIMIT 3").all();
    return NextResponse.json({
      ok: true,
      users,
      contributions: contribs,
      badges,
      sample_users: sample.results,
      sample_contributions: contributions_sample.results,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : null,
    }, { status: 500 });
  }
}
