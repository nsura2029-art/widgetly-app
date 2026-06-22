/**
 * GET /api/_diag/env — TEMPORARY diagnostic endpoint.
 *
 * Returns whether ADMIN_SESSION_SECRET is present in the Worker's env.
 * DO NOT KEEP THIS IN PROD — it leaks whether secrets are configured
 * (not the values, just their presence). Remove before going to main.
 */
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";

export async function GET() {
  let secretPresent = false;
  let contextAvailable = false;
  let contextError: string | null = null;
  try {
    const ctx = getCloudflareContext();
    contextAvailable = true;
    secretPresent = !!(ctx.env as { ADMIN_SESSION_SECRET?: string })?.ADMIN_SESSION_SECRET;
  } catch (e) {
    contextError = (e as Error)?.message ?? String(e);
  }
  return NextResponse.json({
    contextAvailable,
    secretPresent,
    contextError,
    timestamp: new Date().toISOString(),
  });
}
