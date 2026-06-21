import { NextResponse, type NextRequest } from "next/server";
import { generateId, jsonError, withErrorHandling } from "@/lib/api/responses";
import {
  getSuggestionByIdOrSlug,
  removeSuggestionUpvote,
  setSuggestionUpvote,
  type SuggestionRecord,
} from "@/lib/d1/suggestions";
import { isD1Configured } from "@/lib/d1/server";

export const runtime = "nodejs";

type Params = { id: string };
const SESSION_COOKIE = "wly_suggest_session";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function userId(request: NextRequest): number | null {
  const header = request.headers.get("x-widgetly-user-id");
  if (!header || !/^\d+$/.test(header)) return null;
  return Number(header);
}

type UpvoteContext =
  | { response: NextResponse }
  | {
      suggestion: SuggestionRecord;
      sessionId: string;
      ipHash: string;
      userId: number | null;
      setCookie: boolean;
    };

async function context(request: NextRequest, idOrSlug: string): Promise<UpvoteContext> {
  if (!isD1Configured()) {
    return {
      response: jsonError(503, "d1_not_configured", "Suggestion storage is not configured."),
    };
  }

  const suggestion = await getSuggestionByIdOrSlug(idOrSlug);
  if (!suggestion) {
    return { response: jsonError(404, "not_found", "Suggestion not found.") };
  }

  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession || generateId("sv");
  const ipHash = await sha256(`${clientIp(request)}:${process.env.UPVOTE_HASH_SALT ?? "widgetly"}`);
  return {
    suggestion,
    sessionId,
    ipHash,
    userId: userId(request),
    setCookie: !existingSession,
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const ctx = await context(request, id);
    if ("response" in ctx) return ctx.response;

    const result = await setSuggestionUpvote({
      suggestionId: ctx.suggestion.id,
      ipHash: ctx.ipHash,
      sessionId: ctx.sessionId,
      userId: ctx.userId,
      weight: ctx.userId ? 2 : 1,
    });
    const response = NextResponse.json({ ok: true, ...result });
    if (ctx.setCookie) {
      response.cookies.set(SESSION_COOKIE, ctx.sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return response;
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withErrorHandling(async () => {
    const { id } = await params;
    const ctx = await context(request, id);
    if ("response" in ctx) return ctx.response;

    const result = await removeSuggestionUpvote({
      suggestionId: ctx.suggestion.id,
      ipHash: ctx.ipHash,
      sessionId: ctx.sessionId,
      userId: ctx.userId,
    });
    const response = NextResponse.json({ ok: true, ...result });
    if (ctx.setCookie) {
      response.cookies.set(SESSION_COOKIE, ctx.sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return response;
  });
}
