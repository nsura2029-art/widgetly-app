import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
  Calculator,
  ArrowLeftRight,
  Search,
  Code,
  Briefcase,
  GraduationCap,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  FileText,
  Image: ImageIcon,
  Video,
  Sparkles,
  Calculator,
  ArrowLeftRight,
  Search,
  Code,
  Briefcase,
  GraduationCap,
  PenLine,
};

const ACCENT_CLASSES: Record<"primary" | "secondary" | "accent", string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
};

export const metadata: Metadata = buildMetadata({
  title: "All Online Tools",
  description:
    "Browse 500+ free online tools by category: PDF, image, video, AI, calculators, converters, SEO, developer, business, education, and writing. No sign-up, no installs, runs in your browser.",
  path: "/tools",
  keywords: [
    "online tools",
    "free online tools",
    "productivity tools",
    "web tools",
    "online widgets",
    "browser tools",
    "tool platform",
    "free utilities",
    "tool collection",
    "online productivity tools",
  ],
});

export default function ToolsIndexPage() {
  return (
    <PageShell width="wide" asArticle>
      <div className="flex flex-col items-start">
        <Badge variant="secondary" className="self-start">
          The tool library
        </Badge>
        <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Every free online tool,
          <br />
          in one place.
        </h1>
        <p className="text-muted mt-5 max-w-2xl text-base leading-relaxed">
          {SITE_CONFIG.name} brings together {SITE_CONFIG.name}&apos;s full library of free online
          tools. Pick a category below — every tool runs in your browser, no sign-up, no watermarks,
          and no surprise paywalls.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS_CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.icon] ?? FileText;
          return (
            <Link
              key={cat.slug}
              href={`/tools/${cat.slug}`}
              className="group border-border/60 hover:border-primary/40 shadow-soft hover:shadow-soft-lg block rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    ACCENT_CLASSES[cat.accent]
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-muted text-xs font-medium tabular-nums">
                  {cat.count}+ tools
                </span>
              </div>
              <h2 className="text-foreground group-hover:text-primary mt-4 text-lg font-semibold">
                {cat.name}
              </h2>
              <p className="text-muted mt-1.5 text-sm leading-relaxed">{cat.pitch}</p>
              <p className="text-primary mt-4 inline-flex items-center text-sm font-medium">
                Browse {cat.name.toLowerCase()}
                <span
                  aria-hidden="true"
                  className="ml-1 transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </p>
            </Link>
          );
        })}
      </div>

      <p className="text-muted mt-12 max-w-2xl text-sm">
        Don&apos;t see the tool you need?{" "}
        <Link
          href="/suggest"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Suggest one
        </Link>{" "}
        — the most-requested ideas jump to the top of our build queue.
      </p>
    </PageShell>
  );
}
