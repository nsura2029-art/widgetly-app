import { NextResponse, type NextRequest } from "next/server";
import { getD1 } from "@/lib/d1/server";

export const runtime = "edge";

export async function GET(_req: NextRequest) {
  try {
    const db = getD1();
    const users = await db.prepare("SELECT COUNT(*) as c FROM users").first();
    const contribs = await db.prepare("SELECT COUNT(*) as c FROM contributions").first();
    const badges = await db.prepare("SELECT COUNT(*) as c FROM badges").first();
    const sample = await db.prepare("SELECT handle, display_name FROM users LIMIT 3").all();
    return NextResponse.json({
      ok: true,
      users: users,
      contributions: contribs,
      badges: badges,
      sample: sample.results,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    }, { status: 500 });
  }
}
