import type { SuggestionRecord, SuggestionStatus } from "@/lib/d1/suggestions";
import { suggestionStatusLabel } from "@/lib/d1/suggestions";
import { cn } from "@/lib/utils";

export type PublicSuggestion = Omit<SuggestionRecord, "email">;

export function statusBadgeClass(status: SuggestionStatus): string {
  switch (status) {
    case "in_review":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700";
    case "building":
      return "border-blue-500/25 bg-blue-500/10 text-blue-700";
    case "live":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
    case "rejected":
      return "border-slate-500/25 bg-slate-500/10 text-slate-700";
  }
}

export function StatusBadge({ status }: { status: SuggestionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
        statusBadgeClass(status)
      )}
    >
      {suggestionStatusLabel(status)}
    </span>
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatSuggestionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
