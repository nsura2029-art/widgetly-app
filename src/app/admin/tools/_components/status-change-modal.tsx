"use client";

/**
 * Status change modal — used for both single-tool and bulk status
 * changes. Computes the valid next statuses from the current state
 * (using canTransition from src/lib/admin/tools) and shows only the
 * legal options. Backdrop click + Escape close the modal.
 */
import * as React from "react";
import { X, Loader2 } from "lucide-react";
import type { AdminTool, ToolStatus } from "@/lib/admin/tools";

const STATUS_META: Record<ToolStatus, { label: string; tone: string; description: string }> = {
  suggested: {
    label: "Suggested",
    tone: "bg-amber-500/10 text-amber-700 border-amber-500/40",
    description: "Newly suggested. Awaiting first review.",
  },
  under_review: {
    label: "Under review",
    tone: "bg-sky-500/10 text-sky-700 border-sky-500/40",
    description: "An admin is evaluating the request.",
  },
  in_progress: {
    label: "In progress",
    tone: "bg-indigo-500/10 text-indigo-700 border-indigo-500/40",
    description: "Approved; being built. Not yet public.",
  },
  live: {
    label: "Live",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/40",
    description: "Visible in the public menu immediately.",
  },
  deprecated: {
    label: "Deprecated",
    tone: "bg-stone-500/10 text-stone-700 border-stone-500/40",
    description: "Hidden from the public menu; data preserved.",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-500/10 text-rose-700 border-rose-500/40",
    description: "Not a fit. Visible to admins only.",
  },
};

// Mirror of canTransition in src/lib/admin/tools.ts. Kept in sync
// intentionally — we can't import the server module from a client
// component without dragging in the D1 client.
const TRANSITIONS: Record<ToolStatus, ReadonlyArray<ToolStatus>> = {
  suggested: ["under_review", "rejected"],
  under_review: ["in_progress", "suggested", "rejected"],
  in_progress: ["live", "under_review", "rejected"],
  live: ["deprecated"],
  deprecated: ["live"],
  rejected: ["suggested", "under_review"],
};

export function StatusChangeModal({
  tools,
  initialTarget,
  onClose,
  onApply,
  busy,
}: {
  tools: AdminTool[];
  initialTarget?: ToolStatus;
  onClose: () => void;
  onApply: (status: ToolStatus, notes: string) => void;
  busy: boolean;
}) {
  // The legal next statuses are the union of legal transitions from
  // every selected tool's current state. Deduplicated and sorted in
  // lifecycle order.
  const lifecycleOrder: ToolStatus[] = [
    "suggested",
    "under_review",
    "in_progress",
    "live",
    "deprecated",
    "rejected",
  ];
  const legalNext = React.useMemo(() => {
    const set = new Set<ToolStatus>();
    for (const t of tools) {
      for (const n of TRANSITIONS[t.status]) set.add(n);
    }
    return lifecycleOrder.filter((s) => set.has(s));
  }, [tools]);

  const [target, setTarget] = React.useState<ToolStatus | null>(initialTarget ?? null);
  const [notes, setNotes] = React.useState("");

  // Auto-pick the first legal option if the user hasn't chosen one.
  React.useEffect(() => {
    if (target == null && legalNext.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTarget(legalNext[0]!);
    }
  }, [legalNext, target]);

  // Close on Escape.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const from = tools[0]?.status;
  const multiple = tools.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div
        className="bg-card border-border w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="status-modal-title" className="text-foreground text-lg font-semibold">
              {multiple
                ? `Change status of ${tools.length} tools`
                : `Change status: ${tools[0]?.name}`}
            </h2>
            {from && !multiple && (
              <p className="text-muted-foreground mt-1 text-sm">
                Currently{" "}
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${STATUS_META[from].tone}`}
                >
                  {STATUS_META[from].label}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {legalNext.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No legal status transitions from the current state.
          </p>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="text-foreground mb-2 text-sm font-medium">New status</legend>
              {legalNext.map((s) => {
                const meta = STATUS_META[s];
                const checked = target === s;
                return (
                  <label
                    key={s}
                    className={`border-border flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      checked ? "bg-primary/5 border-primary/40" : "hover:bg-muted/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={checked}
                      onChange={() => setTarget(s)}
                      disabled={busy}
                      className="text-primary mt-1 h-4 w-4 border-stone-300"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">{meta.description}</p>
                    </div>
                  </label>
                );
              })}
            </fieldset>

            <div className="mt-4">
              <label htmlFor="notes" className="text-foreground mb-1.5 block text-sm font-medium">
                Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                rows={3}
                placeholder="Why is this status change happening? Visible in the audit log."
                className="border-border focus:border-primary focus:ring-primary/20 w-full rounded-xl border bg-white px-3.5 py-2 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
              />
            </div>

            {target === "live" && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                These tools will appear in the public menu immediately after the change.
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="border-border hover:bg-muted/5 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => target && onApply(target, notes)}
            disabled={busy || !target || legalNext.length === 0}
            className="bg-brand-gradient text-foreground inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Apply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
