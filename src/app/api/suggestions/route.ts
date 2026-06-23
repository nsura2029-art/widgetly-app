import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api/responses";
import { isD1Configured } from "@/lib/d1/server";
import {
  countSuggestionsByEmailToday,
  createSuggestion,
  listSuggestions,
  normalizeSort,
} from "@/lib/d1/suggestions";
import { suggestionFormSchema } from "@/lib/suggestions/validation";
import { requireUser } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    if (!isD1Configured()) {
      return jsonError(503, "d1_not_configured", "Suggestion storage is not configured.");
    }

    const search = request.nextUrl.searchParams;
    const page = Number(search.get("page") ?? "1");
    const result = await listSuggestions({
      category: search.get("category"),
      status: search.get("status"),
      sort: normalizeSort(search.get("sort")),
      page: Number.isFinite(page) ? page : 1,
      pageSize: 20,
    });

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    // Auth gate: suggestions require a Clerk sign-in. We use the
    // Clerk primary email as the suggestion's contact email,
    // overriding whatever the client sent. This prevents spam
    // and lets the per-email rate limit do its job.
    const user = await requireUser();
    if (!user.email) {
      return jsonError(
        400,
        "email_required",
        "Your account needs a verified email to submit suggestions."
      );
    }

    if (!isD1Configured()) {
      return jsonError(503, "d1_not_configured", "Suggestion storage is not configured.");
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return jsonError(400, "invalid_json", "Request body must be valid JSON.");
    }

    const parsed = suggestionFormSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(
        400,
        "validation_error",
        "Some fields didn't pass validation.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "(root)",
          // The Zod `message` is now a stable code from
          // SUGGESTION_ERROR_CODES (e.g. "toolNameMin") rather than
          // a human-readable string. Clients translate it via
          // `useTranslations("suggest.formNew.errors")`. See
          // src/lib/suggestions/validation.ts.
          message: issue.message,
        }))
      );
    }

    // Override the client-provided email with the Clerk-verified
    // one. We don't trust the client to know its own email —
    // only Clerk's auth state does.
    const payload = { ...parsed.data, email: user.email };

    const submittedToday = await countSuggestionsByEmailToday(payload.email);
    if (submittedToday >= 3) {
      return jsonError(
        429,
        "rate_limited",
        "You can submit up to 3 suggestions per email each day. Please try again tomorrow."
      );
    }

    const suggestion = await createSuggestion(payload);
    return NextResponse.json({ ok: true, suggestion }, { status: 201 });
  });
}
