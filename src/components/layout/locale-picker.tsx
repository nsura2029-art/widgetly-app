"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALES, type LocaleCode } from "@/i18n/config";

/**
 * Language picker for the header. Borderless inline trigger in the style
 * of Convertio's footer — just a globe icon + current locale's full
 * native name + chevron. Click opens a popover with the full locale list
 * for switching. On selection, POSTs /api/locale to persist (cookie +
 * KV), then navigates to the equivalent path under the new locale and
 * refreshes server components.
 *
 * Visual states:
 *   - Collapsed: globe icon + current nativeName (e.g. "English")
 *   - Open: popover with the full list of 24 locales, current row checked
 *   - Pending: brief dim while the API call is in flight
 */
export function LocalePicker() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const current = useLocale() as LocaleCode;
  const t = useTranslations("header.localePicker");

  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<LocaleCode | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Build the equivalent pathname under a new locale prefix.
   * Examples:
   *   /en/blog/foo  +  es  →  /es/blog/foo
   *   /en           +  es  →  /es
   *   /blog/foo     +  es  →  /es/blog/foo  (defensive — shouldn't happen)
   */
  function localizedPathname(target: LocaleCode): string {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] && LOCALES.some((l) => l.code === segments[0])) {
      segments[0] = target;
    } else {
      segments.unshift(target);
    }
    return "/" + segments.join("/");
  }

  async function pick(target: LocaleCode) {
    if (target === current || pending) {
      setOpen(false);
      return;
    }
    setPending(target);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: target }),
      });
      if (!res.ok) {
        console.error("[LocalePicker] POST /api/locale failed", await res.text());
        return;
      }
      setOpen(false);
      router.push(localizedPathname(target));
      router.refresh();
    } catch (err) {
      console.error("[LocalePicker] pick failed", err);
    } finally {
      setPending(null);
    }
  }

  const currentMeta = LOCALES.find((l) => l.code === current) ?? LOCALES[0]!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("label")}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          // Borderless inline trigger — matches Convertio's footer pattern.
          // No border, no background, just icon + native name + chevron.
          // Sits inline with text content rather than as a button-shaped control.
          "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
          "focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          pending && "opacity-60"
        )}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{currentMeta.nativeName}</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="menu"
          aria-label={t("label")}
          className="border-border/80 shadow-soft-lg absolute right-0 bottom-full z-50 mb-2 max-h-96 w-56 scrollbar-none overflow-y-auto rounded-xl border bg-white"
        >
          {LOCALES.map((loc) => {
            const isCurrent = loc.code === current;
            const isPending = pending === loc.code;
            return (
              <li key={loc.code} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => pick(loc.code)}
                  disabled={pending !== null}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                    "hover:bg-muted/5 focus-visible:bg-muted/5 focus-visible:outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-foreground truncate font-medium">{loc.nativeName}</span>
                    {loc.nativeName !== loc.englishName && (
                      <span className="text-muted truncate text-xs">{loc.englishName}</span>
                    )}
                  </span>
                  {isCurrent && (
                    <span className="text-primary text-xs" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {isPending && <span className="text-muted text-xs">…</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
