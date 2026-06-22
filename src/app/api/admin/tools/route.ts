/**
 * GET  /api/admin/tools          — list with filters
 * POST /api/admin/tools          — create a new tool
 *
 * Both require an active admin session.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin/auth";
import { createTool, isToolStatus, listTools, type ToolCreate } from "@/lib/admin/tools";

export const runtime = "nodejs";

const VALID_TIERS = new Set(["free", "freemium", "paid"]);
const VALID_ACCENTS = new Set(["primary", "secondary", "accent"]);

export async function GET(req: NextRequest) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const category = url.searchParams.get("category") ?? "all";
  const q = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const result = await listTools({
    status: isToolStatus(status) ? status : "all",
    category,
    q,
    limit,
    offset,
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<ToolCreate> & { notes?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  // Validate
  if (!body.slug || !body.category || !body.name) {
    return NextResponse.json({ error: "slug, category, and name are required" }, { status: 400 });
  }
  if (body.status && !isToolStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.pricing_tier && !VALID_TIERS.has(body.pricing_tier)) {
    return NextResponse.json({ error: "Invalid pricing_tier" }, { status: 400 });
  }
  if (body.accent_color && !VALID_ACCENTS.has(body.accent_color)) {
    return NextResponse.json({ error: "Invalid accent_color" }, { status: 400 });
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
