"use client";

/**
 * Edit form for a single tool. PATCHes the admin API on submit, then
 * refreshes the page so the server-rendered header (status badge)
 * reflects the new state.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { StatusChangeModal } from "./status-change-modal";
import { TOOL_STATUSES, type AdminTool, type ToolStatus } from "@/lib/admin/tools";

const TIERS = ["free", "freemium", "paid"] as const;
const ACCENTS = ["primary", "secondary", "accent"] as const;

export function ToolEditForm({ tool }: { tool: AdminTool }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: tool.name,
    slug: tool.slug,
    category: tool.category,
    description: tool.description,
    long_description: tool.long_description,
    api_endpoint: tool.api_endpoint ?? "",
    pricing_tier: tool.pricing_tier,
    icon_url: tool.icon_url ?? "",
    accent_color: tool.accent_color,
    sort_order: tool.sort_order,
    status: tool.status,
    notes: tool.notes,
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch(`/api/admin/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          category: form.category,
          description: form.description,
          long_description: form.long_description,
          api_endpoint: form.api_endpoint || null,
          pricing_tier: form.pricing_tier,
          icon_url: form.icon_url || null,
          accent_color: form.accent_color,
          sort_order: Number(form.sort_order) || 0,
          status: form.status,
          notes: form.notes,
        }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Save failed");
      }
      setSuccess("Saved.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onStatusApply(status: ToolStatus, notes: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Status change failed");
      }
      setStatusModalOpen(false);
      // Update local form state + revalidate the server render so the
      // header badge + history reflect the change.
      patch("status", status);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSave}
      className="border-border bg-card shadow-soft space-y-6 rounded-2xl border p-6"
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Status block */}
      <div className="border-border/60 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-foreground text-sm font-semibold">Status</div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              Current: <span className="text-foreground font-medium">{form.status}</span> · Live
              tools appear in the public menu
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="border-border hover:bg-muted/5 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors"
          >
            Change status
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <input
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            required
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
          />
        </Field>
        <Field label="Slug" required>
          <input
            value={form.slug}
            onChange={(e) =>
              patch("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
            }
            required
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </Field>
        <Field label="Category" required>
          <input
            value={form.category}
            onChange={(e) => patch("category", e.target.value)}
            required
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => patch("sort_order", Number(e.target.value))}
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Short description" hint="Shown in cards and the category index.">
        <textarea
          value={form.description}
          onChange={(e) => patch("description", e.target.value)}
          rows={2}
          className="border-border focus:border-primary focus:ring-primary/20 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </Field>

      <Field label="Long description" hint="Markdown not supported. Plain text only.">
        <textarea
          value={form.long_description}
          onChange={(e) => patch("long_description", e.target.value)}
          rows={5}
          className="border-border focus:border-primary focus:ring-primary/20 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="API endpoint" hint="Internal route for this tool.">
          <input
            value={form.api_endpoint ?? ""}
            onChange={(e) => patch("api_endpoint", e.target.value)}
            placeholder="/api/tools/..."
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 font-mono text-sm focus:ring-2 focus:outline-none"
          />
        </Field>
        <Field label="Icon URL">
          <input
            value={form.icon_url ?? ""}
            onChange={(e) => patch("icon_url", e.target.value)}
            placeholder="https://... or /icons/..."
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
          />
        </Field>
        <Field label="Pricing tier">
          <select
            value={form.pricing_tier}
            onChange={(e) => patch("pricing_tier", e.target.value as typeof form.pricing_tier)}
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Accent color">
          <select
            value={form.accent_color}
            onChange={(e) => patch("accent_color", e.target.value as typeof form.accent_color)}
            className="border-border focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border bg-white px-3 text-sm focus:ring-2 focus:outline-none"
          >
            {ACCENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Admin notes" hint="Internal only. Never shown on the public site.">
        <textarea
          value={form.notes}
          onChange={(e) => patch("notes", e.target.value)}
          rows={3}
          className="border-border focus:border-primary focus:ring-primary/20 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Link href="/admin/tools" className="text-muted-foreground hover:text-foreground text-sm">
          ← Back to tools
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="bg-brand-gradient text-foreground inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save changes
            </>
          )}
        </button>
      </div>

      {statusModalOpen && (
        <StatusChangeModal
          tools={[{ ...tool, ...form }]}
          onClose={() => setStatusModalOpen(false)}
          onApply={onStatusApply}
          busy={busy}
        />
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-foreground mb-1 block text-sm font-medium">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="text-muted-foreground mt-1 block text-xs">{hint}</span>}
    </label>
  );
}
