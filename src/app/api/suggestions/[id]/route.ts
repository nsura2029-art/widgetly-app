import { NextResponse, type NextRequest } from "next/server";
import { jsonError, withErrorHandling } from "@/lib/api/responses";
import { getSuggestionByIdOrSlug } from "@/lib/d1/suggestions";
import { isD1Configured } from "@/lib/d1/server";

export const runtime = "nodejs";

type Params = { id: string };

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  return withErrorHandling(async () => {
    if (!isD1Configured()) {
      return jsonError(503, "d1_not_configured", "Suggestion storage is not configured.");
    }

    const { id } = await params;
    const suggestion = await getSuggestionByIdOrSlug(id);
    if (!suggestion) {
      return jsonError(404, "not_found", "Suggestion not found.");
    }

    return NextResponse.json(
      { ok: true, suggestion },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  });
}
