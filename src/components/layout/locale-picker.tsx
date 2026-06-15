"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALES, type LocaleCode } from "@/i18n/config";

/**
 * Language picker for the header. Lists all 24 supported locales with
 * their native names; on selection, calls POST /api/locale to persist
 * the choice (cookie + KV), then navigates to the equivalent path under
 * the new locale prefix and refreshes server components.
 *
 * Visual states:
 *   - Collapsed: globe icon + current shortLabel (e.g. "EN")
 *   - Open: popover with the full list, native names, current row checked
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
    // If the first segment is a supported locale, replace it. Otherwise
    // (unprefixed URL, which shouldn't happen in [locale] routes but is
    // defensive), prepend the target locale.
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
      // Navigate to the equivalent path under the new locale, then
      // refresh so server components re-render with the new messages.
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
          "border-border/80 inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white/60 px-2.5 text-xs font-medium text-foreground backdrop-blur transition-colors hover:bg-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="uppercase tabular-nums">{currentMeta.shortLabel}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="menu"
          aria-label={t("label")}
          className="absolute right-0 z-50 mt-2 max-h-96 w-56 overflow-y-auto rounded-xl border border-border/80 bg-white shadow-soft-lg"
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
                    <span className="truncate font-medium text-foreground">
                      {loc.nativeName}
                    </span>
                    {loc.nativeName !== loc.englishName && (
                      <span className="truncate text-xs text-muted">
                        {loc.englishName}
                      </span>
                    )}
                  </span>
                  {isCurrent && (
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  {isPending && (
                    <span className="text-xs text-muted">…</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
