/**
 * GET /api/admin/auth/session
 *
 * Lightweight check used by the admin layout. Returns 200 if the
 * session is valid, 401 otherwise. No body content.
 */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
