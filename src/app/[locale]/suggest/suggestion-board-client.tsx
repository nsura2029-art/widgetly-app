"use client";

import { motion } from "framer-motion";
import { ArrowUp, CalendarDays, Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  StatusBadge,
  formatSuggestionDate,
  initials,
  type PublicSuggestion,
} from "./suggestion-ui";

export function SuggestionBoardClient({
  suggestions,
  emptyCta = true,
}: {
  suggestions: PublicSuggestion[];
  emptyCta?: boolean;
}) {
  if (suggestions.length === 0) {
    return (
      <div className="border-border/60 shadow-soft mx-auto flex max-w-2xl flex-col items-center rounded-2xl border bg-white/75 p-10 text-center backdrop-blur">
        <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
          <Search className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-foreground mt-5 text-2xl font-semibold">
          Be the first to suggest a tool!
        </h2>
        <p className="text-muted mt-2 max-w-md text-sm leading-relaxed">
          The board is ready for ideas. Submit the first request and share it with the community.
        </p>
        {emptyCta && (
          <Button asChild className="mt-6">
            <Link href="/suggest/new">
              <Plus className="h-4 w-4" />
              Suggest a tool
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {suggestions.map((suggestion, index) => (
        <motion.article
          key={suggestion.slug}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.2) }}
          whileHover={{ y: -4, boxShadow: "0 18px 45px rgba(16, 24, 40, 0.10)" }}
          className="border-border/60 shadow-soft flex min-h-[280px] flex-col rounded-2xl border bg-white/80 p-5 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="border-border bg-muted/5 text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
              {suggestion.category}
            </span>
            <StatusBadge status={suggestion.status} />
          </div>

          <Link href={`/suggest/${suggestion.slug}`} className="group mt-4 block">
            <h2 className="text-foreground group-hover:text-primary text-lg font-semibold tracking-tight">
              {suggestion.toolName}
            </h2>
            <p className="text-muted mt-2 line-clamp-3 text-sm leading-relaxed">
              {suggestion.description}
            </p>
          </Link>

          <div className="mt-auto pt-5">
            <div className="border-border/60 bg-muted/5 flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                  {initials(suggestion.toolName)}
                </span>
                <span className="text-muted inline-flex items-center gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatSuggestionDate(suggestion.createdAt)}
                </span>
              </div>
              <span className="text-foreground inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <ArrowUp className="text-primary h-4 w-4" aria-hidden="true" />
                {suggestion.upvotes.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
