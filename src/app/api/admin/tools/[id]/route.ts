/**
 * GET    /api/admin/tools/[id]   — fetch one tool
 * PATCH  /api/admin/tools/[id]   — partial update (fields or status)
 * DELETE /api/admin/tools/[id]   — hard delete (admin-only escape hatch)
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin/auth";
import {
  deleteTool,
  getStatusHistoryForTool,
  getTool,
  isToolStatus,
  type ToolUpdate,
  updateTool,
} from "@/lib/admin/tools";

export const runtime = "nodejs";

const VALID_TIERS = new Set(["free", "freemium", "paid"]);
const VALID_ACCENTS = new Set(["primary", "secondary", "accent"]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const tool = await getTool(id);
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const history = await getStatusHistoryForTool(id);
  return NextResponse.json({ tool, history });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Partial<ToolUpdate> & { notes?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
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

  try {
    const updated = await updateTool(id, body, ctx.user.id);
    return NextResponse.json({ tool: updated });
  } catch (err) {
    const msg = (err as Error)?.message ?? "Unknown error";
    if (msg.startsWith("Illegal transition")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await deleteTool(id);
  return NextResponse.json({ ok: true });
}
