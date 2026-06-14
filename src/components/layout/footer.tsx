"use client";

import { Link } from "@/i18n/navigation";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { useTranslations } from "next-intl";
import { FOOTER_LINKS, SITE_CONFIG } from "@/lib/constants";

const SOCIAL_ICONS = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
} as const;

export function Footer() {
  const t = useTranslations("footer");
  const tLinks = useTranslations("footer.links");
  const tSite = useTranslations("site");
  const year = new Date().getFullYear();
  return (
    <footer
      id="contact"
      className="relative overflow-hidden border-t border-border/60 bg-dark text-white"
    >
      {/* Soft brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(91,108,255,0.25), transparent 60%)",
        }}
      />
      <div className="container relative z-10 py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-white">
              <Logo
                className="text-white [&_span]:!text-white"
                showWordmark={false}
              />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {tSite("description")}
            </p>
            <div className="mt-6 flex items-center gap-2">
              {FOOTER_LINKS.social.map((link) => {
                const Icon =
                  SOCIAL_ICONS[link.icon as keyof typeof SOCIAL_ICONS] ??
                  Github;
                return (
                  <a
                    key={link.labelKey}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={tLinks(link.labelKey)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-4">
            <FooterColumn title={t("columns.product")} links={FOOTER_LINKS.product} />
            <FooterColumn title={t("columns.resources")} links={FOOTER_LINKS.resources} />
            <FooterColumn title={t("columns.company")} links={FOOTER_LINKS.company} />
            <FooterColumn title={t("columns.legal")} links={FOOTER_LINKS.legal} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 md:flex-row md:items-center">
          <p>
            {t.rich("copyright", {
              year,
              siteName: tSite("name"),
            })}
          </p>
          <p>
            {t.rich("builtWith", {
              platform: (
                <span className="text-white/80">Cloudflare</span>
              ) as unknown as string,
            })}
          </p>
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
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.labelKey}>
            <Link
              href={link.href}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
