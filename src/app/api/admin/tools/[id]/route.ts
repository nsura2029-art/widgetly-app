/**
 * GET    /api/admin/tools/[id]   — fetch one tool
 * PATCH  /api/admin/tools/[id]   — partial update (fields or status)
 * DELETE /api/admin/tools/[id]   — hard delete (admin-only escape hatch)
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminFromRequest, requireCsrfHeader } from "@/lib/admin/auth";
import { deleteTool, getStatusHistoryForTool, getTool, updateTool } from "@/lib/admin/tools";
import { ToolIdParam, UpdateToolBody } from "@/lib/admin/schemas";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const idParsed = ToolIdParam.safeParse(await params);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const tool = await getTool(idParsed.data.id);
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const history = await getStatusHistoryForTool(idParsed.data.id);
  return NextResponse.json({ tool, history });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCsrfHeader(req))) {
    return NextResponse.json({ error: "CSRF token missing or invalid" }, { status: 403 });
  }

  const idParsed = ToolIdParam.safeParse(await params);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let body;
  try {
    body = UpdateToolBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", issues: (err as { issues?: unknown }).issues },
      { status: 400 }
    );
  }

  try {
    const updated = await updateTool(idParsed.data.id, body, ctx.user.id);
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCsrfHeader(req))) {
    return NextResponse.json({ error: "CSRF token missing or invalid" }, { status: 403 });
  }

  const idParsed = ToolIdParam.safeParse(await params);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await deleteTool(idParsed.data.id);
  return NextResponse.json({ ok: true });
}
