"use client";

import { Link } from "@/i18n/navigation";
import { Github, Twitter, Send } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LocalePicker } from "@/components/layout/locale-picker";
import { useTranslations } from "next-intl";
import { FOOTER_LINKS } from "@/lib/constants";

/**
 * Icon map for the social row in the brand column.
 * Discord isn't in lucide-react's free set under that name; we render it
 * as a `Send` icon (same brand mark on the legacy discord.gg/widgetly link)
 * and reserve the `discord` key for any future migration to a custom SVG.
 * Kept as a small typed object so `as keyof typeof SOCIAL_ICONS` keeps the
 * compiler honest about typos in `FOOTER_LINKS.social[].icon`.
 */
const SOCIAL_ICONS = {
  github: Github,
  twitter: Twitter,
  discord: Send,
} as const;

/**
 * Site footer.
 *
 * Layout (top → bottom):
 *  1. Brand column + 3 link columns (Tools / Company / Legal)
 *  2. Subtle separator + bottom bar with copyright on the left and the
 *     small Site links (Status / Contact / Feedback) on the right
 *
 * The whole footer renders on a light surface (`bg-background`) so it
 * inherits the Widgetly theme tokens automatically — primary text uses
 * `text-foreground`, muted link labels use `text-muted-foreground`, the
 * brand logo keeps its purple gradient via `bg-brand-gradient`, and the
 * divider uses `border-border`. No hard-coded colors that would drift
 * from the rest of the site if the theme changes.
 *
 * All copy is i18n-keyed via next-intl. SEO-bearing links (privacy,
 * terms, sitemap, etc.) keep their hrefs intact so this is a UI-only
 * change — sitemap, JSON-LD, hreflang, and route keys are not touched.
 */
export function Footer() {
  const t = useTranslations("footer");
  const tLinks = useTranslations("footer.links");
  const tSite = useTranslations("site");
  const year = new Date().getFullYear();

  return (
    <footer
      id="contact"
      aria-labelledby="footer-heading"
      className="bg-background text-foreground border-border/60 border-t"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="container py-12 sm:py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-3">
            <Link
              href="/"
              aria-label={tSite("name")}
              className="text-foreground inline-flex items-center gap-2 font-semibold tracking-tight"
            >
              <span
                aria-hidden="true"
                className="bg-brand-gradient shadow-glow-sm relative inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5"
              >
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  aria-hidden="true"
                >
                  <path
                    d="M3 6.5 L7 6.5 L12.5 21 L16 12 L19.5 21 L25 6.5 L29 6.5 L21.5 25.5 L18 25.5 L16 19.5 L14 25.5 L10.5 25.5 Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="text-lg font-semibold">{tSite("name")}</span>
            </Link>
            <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
              {t("tagline")}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {FOOTER_LINKS.social.map((link) => {
                const Icon = SOCIAL_ICONS[link.icon as keyof typeof SOCIAL_ICONS] ?? Github;
                return (
                  <a
                    key={link.labelKey}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={tLinks(link.labelKey)}
                    className="border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 bg-background inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          <FooterColumn key="tools" title={t("columns.tools")} links={FOOTER_LINKS.tools} />
          <FooterColumn key="company" title={t("columns.company")} links={FOOTER_LINKS.company} />
          <FooterColumn key="legal" title={t("columns.legal")} links={FOOTER_LINKS.legal} />
        </div>

        {/* Bottom bar */}
        <div className="border-border/60 mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center">
          <p className="text-muted-foreground">
            {t.rich("copyright", {
              year,
              siteName: tSite("name"),
            })}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-5">
            {/* Language switcher lives at the very bottom of the page,
                left of the utility links. Putting it here (instead of
                in the header) keeps the header minimal and matches
                every well-loved utility site — Vercel, Stripe, GitHub
                all do it this way. */}
            <LocalePicker />
            <ul className="flex items-center gap-5">
              {FOOTER_LINKS.bottom.map((link) => (
                <li key={link.labelKey}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {tLinks(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ labelKey: string; href: string }>;
}) {
  const t = useTranslations("footer.links");
  return (
    <nav aria-label={title} className="md:col-span-3">
      <h3 className="text-foreground text-xs font-semibold tracking-[0.18em] uppercase">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.labelKey}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
