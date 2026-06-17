import { openapiSpec } from "@/lib/api/openapi";
import { NextResponse } from "next/server";

/**
 * GET /api/openapi.json
 *
 * Serves the OpenAPI 3.0 specification as JSON. Self-describing —
 * the same document drives the Swagger UI at `/docs`.
 */
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(openapiSpec, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
