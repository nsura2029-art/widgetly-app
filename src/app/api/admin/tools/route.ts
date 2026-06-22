/**
 * GET  /api/admin/tools          — list with filters
 * POST /api/admin/tools          — create a new tool
 *
 * Both require an active admin session.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminFromRequest, requireCsrfHeader } from "@/lib/admin/auth";
import { createTool, listTools } from "@/lib/admin/tools";
import { CreateToolBody, ListToolsQuery } from "@/lib/admin/schemas";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = ListToolsQuery.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const q = parsed.data;
  const result = await listTools({
    status: q.status,
    category: q.category,
    q: q.q,
    sort: q.sort,
    limit: q.limit,
    offset: q.offset,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCsrfHeader(req))) {
    return NextResponse.json({ error: "CSRF token missing or invalid" }, { status: 403 });
  }

  let body;
  try {
    body = CreateToolBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", issues: (err as { issues?: unknown }).issues },
      { status: 400 }
    );
  }

  const row = await createTool(
    {
      slug: body.slug,
      category: body.category,
      name: body.name,
      description: body.description ?? "",
      long_description: body.long_description ?? "",
      api_endpoint: body.api_endpoint ?? null,
      pricing_tier: body.pricing_tier ?? "free",
      icon_url: body.icon_url ?? null,
      accent_color: body.accent_color ?? "primary",
      sort_order: body.sort_order ?? 100,
      status: body.status ?? "suggested",
      notes: body.notes ?? "",
      created_by: ctx.user.id,
    },
    ctx.user.id
  );
  return NextResponse.json({ tool: row }, { status: 201 });
}
