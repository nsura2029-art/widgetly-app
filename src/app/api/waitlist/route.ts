import { NextResponse } from "next/server";

/**
 * Optional waitlist endpoint. In a static export this isn't available,
 * and the form gracefully falls back to local success. When deployed to
 * Cloudflare Pages with edge functions enabled, swap the body of POST
 * with a `env.WAITLIST_KV.put(...)` to persist signups.
 *
 * For now, this is a stub that confirms the wiring works in dev.
 */

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, message: "Invalid email" },
        { status: 400 }
      );
    }

    // Pseudo-random position for the response — replace with a counter
    // stored in Cloudflare KV in production.
    const position = Math.floor(8000 + Math.random() * 1500);

    return NextResponse.json({
      ok: true,
      position,
      message: "You're on the list!",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unexpected error" },
      { status: 500 }
    );
  }
}
