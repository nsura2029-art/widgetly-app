"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Sticky site header. Intentionally minimal — the bulk of the site
 * chrome (Tools, Features, Categories, Blog, About, language picker,
 * GitHub star, Waitlist CTA) lives in the footer or on dedicated
 * landing pages, so the header just needs the brand mark and the one
 * link that genuinely belongs at the top of every page (Leaderboard).
 *
 * Localization:
 *   - Uses `next-intl`'s `<Link>` (re-exported from `@/i18n/navigation`)
 *     so all internal links automatically get the current locale prefix.
 *   - Nav labels and aria attributes are pulled from the `header.*`
 *     namespace via `useTranslations()`.
 */
export default function ClientHeader() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  // Close sheet on resize-up past the breakpoint.
  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll while the mobile menu is open.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close mobile sheet on route change
  React.useEffect(() => {
    // Intentional: this is a one-shot side effect on navigation, not a
    // state-sync-with-external-system pattern. The lint rule is right
    // to flag it in general, but here it's the cleanest way to close
    // the sheet exactly once when the pathname changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const navLinks = [{ href: "/leaderboard", label: t("header.nav.leaderboard") }];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "border-border/70 sticky top-0 z-50 w-full border-b bg-white transition-shadow duration-300"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={t("header.aria.homeLink", { siteName: t("site.name") })}
        >
          <Logo showWordmark={false} />
          <span className="text-lg font-semibold">{t("site.name")}</span>
        </Link>

        <nav
          className="hidden md:flex md:items-center md:gap-1"
          aria-label={t("header.aria.mainNav")}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-foreground hover:bg-muted/5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {/*
            Suggest-a-tool is the header's primary action — the only
            CTA we surface at the top of every page. Promote it to the
            gradient "default" variant so it pops on the white header
            and reads as a real CTA, not a utility link.
          */}
          <Button asChild variant="default" size="sm" className="h-9 gap-2 rounded-lg px-4">
            <Link href="/suggest" aria-label={t("header.aria.suggestTool")}>
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("header.actions.suggestTool")}</span>
            </Link>
          </Button>
        </div>

        {/* Mobile: menu trigger only — language picker lives in the
            footer bottom row on both mobile and desktop. */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? t("header.aria.closeMenu") : t("header.aria.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="border-border text-foreground hover:bg-muted/5 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white/60 backdrop-blur transition-colors hover:bg-white"
          >
            {open ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu sheet */}
      <div
        id="mobile-nav"
        className={cn(
          "border-border/60 overflow-hidden border-t bg-white/95 backdrop-blur-xl transition-all md:hidden",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="container flex flex-col gap-1 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground hover:bg-muted/5 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-border/60 mt-3 flex flex-col gap-2 border-t pt-3">
            <Link
              href="/suggest"
              onClick={() => setOpen(false)}
              className="border-border text-foreground hover:bg-muted/5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition-colors"
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              {t("header.actions.suggestTool")}
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
