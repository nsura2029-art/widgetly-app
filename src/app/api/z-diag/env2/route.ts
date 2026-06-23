import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const allKeys = Object.keys(process.env).filter((k) => k.includes("CLERK"));
  return NextResponse.json({
    clerkKeys: allKeys,
    clerkPublishable: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "(not set)",
    clerkSecret: process.env.CLERK_SECRET_KEY ? "set" : "(not set)",
  });
}
