"use client";

/**
 * Expandable tools list for a leaderboard row.
 *
 * Shows the first `N` tools (default 4) and a "+M more" pill that
 * toggles to reveal the rest. Wrapped in a client component so the
 * expand/collapse state doesn't have to live in the parent server
 * component (which can't use hooks).
 *
 * Why not a CSS-only solution (details/summary):
 *   - details/summary doesn't play nicely with grid layouts and breaks
 *     when the surrounding card resizes during expand.
 *   - We want keyboard focus styles + an `aria-expanded` toggle for
 *     screen readers, which `useState` + button gives us for free.
 */
import * as React from "react";
import { Link } from "@/i18n/navigation";

type Tool = {
  slug: string;
  name: string;
  category: string;
  description: string;
};

export function ExpandableTools({ tools, initial = 4 }: { tools: Tool[]; initial?: number }) {
  const [open, setOpen] = React.useState(false);

  // All cards have at least 1 tool (the page only renders the section
  // when entry.tools.length > 0), so a tools.length <= initial means
  // "nothing to expand". Render all tools, no toggle.
  if (tools.length <= initial) {
    return <ToolPills tools={tools} />;
  }

  const visible = open ? tools : tools.slice(0, initial);
  const hidden = tools.length - initial;

  return (
    <div className="border-border/60 border-t pt-3">
      <div className="text-muted mb-2 text-[10px] font-semibold tracking-wider uppercase">
        Recent tools
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((t) => (
          <ToolPill key={t.slug} tool={t} />
        ))}
        <li>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-muted hover:text-foreground hover:bg-muted/10 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
          >
            {open ? "Show less" : `+${hidden} more`}
          </button>
        </li>
      </ul>
    </div>
  );
}

function ToolPills({ tools }: { tools: Tool[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tools.map((t) => (
        <ToolPill key={t.slug} tool={t} />
      ))}
    </ul>
  );
}

function ToolPill({ tool }: { tool: Tool }) {
  return (
    <li>
      <Link
        href={`/tools/${tool.category}/${tool.slug}`}
        className="border-border bg-muted/5 hover:bg-muted/10 text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors"
      >
        {tool.name}
      </Link>
    </li>
  );
}
