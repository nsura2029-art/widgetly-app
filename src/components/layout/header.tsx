"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Github, Lightbulb, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { NAV_LINKS, SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Sticky, glassmorphic site header. Collapses the nav into a sheet on
 * small viewports and animates a backdrop blur on scroll.
 */
export function Header() {
  const t = useTranslations("header");
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

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

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-border/60 border-b bg-white/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/60"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={`${SITE_CONFIG.name} home`}
        >
          <Logo />
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:bg-muted/5 hover:text-foreground rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm" className="text-foreground gap-2">
            <a
              href={SITE_CONFIG.github}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Widgetly on GitHub"
            >
              <Github />
              <span>Star</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/suggest" aria-label={t("aria.suggestTool")}>
              <Lightbulb />
              <span>{t("actions.suggestTool")}</span>
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="#waitlist">{t("actions.joinWaitlist")}</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-border text-foreground inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white/60 backdrop-blur transition-colors hover:bg-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu sheet */}
      <motion.div
        id="mobile-nav"
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="border-border/60 overflow-hidden border-t bg-white/95 backdrop-blur-xl md:hidden"
      >
        <div className="container flex flex-col gap-1 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-foreground hover:bg-muted/5 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-border/60 mt-3 flex flex-col gap-2 border-t pt-3">
            <Button asChild variant="outline" className="w-full">
              <a href={SITE_CONFIG.github} target="_blank" rel="noreferrer noopener">
                <Github />
                View on GitHub
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/suggest" onClick={() => setOpen(false)}>
                <Lightbulb />
                {t("actions.suggestTool")}
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="#waitlist" onClick={() => setOpen(false)}>
                {t("actions.joinWaitlist")}
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
