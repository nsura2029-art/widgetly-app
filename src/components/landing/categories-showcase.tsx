"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getIcon } from "@/lib/icons";
import { CATEGORIES } from "@/lib/constants";
import { ACCENT_STYLES } from "@/components/shared/accent";
import { cn } from "@/lib/utils";

/**
 * Pre-footer "categories showcase" — the visual hook visitors see right
 * above the footer. Replaces the previous FAQ slot on the home page so
 * the bottom of the landing reads: categories showcase → footer.
 *
 * Why this exists (and isn't just more links in the footer):
 *   - Footer is reference material; this is the decision card. Putting
 *     it one screen above the footer means a visitor who's ready to
 *     browse can act in two clicks instead of scrolling back to the
 *     topnav's "Tools" dropdown.
 *   - The 11-category row paints a clear breadth picture in one glance,
 *     which converts better than long prose for a 500+ tools platform.
 *
 * All copy is i18n-keyed. Each category uses `categories.items.{slug}.shortName`
 * for the chip label (designed to fit under a 56-64px icon without truncation),
 * and the badge + Explore CTA use `home.categoriesShowcase.{badge,exploreCta}`.
 *
 * Background gradient is a static inline style rather than a Tailwind
 * gradient utility because the brand calls for a specific pale lavender
 * → pale pink wash that doesn't map cleanly to any single Tailwind color.
 */
export function CategoriesShowcase() {
  const t = useTranslations("home.categoriesShowcase");
  const tCat = useTranslations("categories");

  return (
    <section
      id="categories-showcase"
      aria-labelledby="categories-showcase-title"
      className="border-border/40 relative overflow-hidden border-t py-16 sm:py-20 lg:py-24"
    >
      {/* Pale lavender → pale pink wash, mirrors the hero CTA backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: "linear-gradient(180deg, #f5f3ff 0%, #fdf2f8 50%, #fff7ed 100%)",
        }}
      />

      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="categories-showcase-title"
            className="text-display-sm text-foreground sm:text-display-md lg:text-display-lg font-semibold tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="text-muted mt-4 text-base sm:text-lg">{t("subtitle")}</p>
        </div>

        {/* Category chip row. 5-col on mobile, 6 on sm, 11 on lg so all 11
            categories fit on a single row at desktop without wrapping. */}
        <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-5 gap-x-4 gap-y-6 sm:grid-cols-6 lg:grid-cols-11">
          {CATEGORIES.map((category) => {
            const Icon = getIcon(category.icon);
            const accent = ACCENT_STYLES[category.accent];
            const shortName = tCat(`items.${category.slug}.shortName`);
            return (
              <li key={category.slug}>
                <Link
                  href={category.href}
                  prefetch={false}
                  aria-label={tCat(`items.${category.slug}.name`)}
                  className="group flex flex-col items-center gap-2 focus:outline-none"
                >
                  <span
                    className={cn(
                      "border-border/60 shadow-soft group-hover:shadow-soft-lg inline-flex h-14 w-14 items-center justify-center rounded-2xl border bg-white transition-all duration-200 group-hover:-translate-y-1 sm:h-16 sm:w-16",
                      accent.iconBg
                    )}
                  >
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
                  </span>
                  <span className="text-foreground text-xs font-medium sm:text-sm">
                    {shortName}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom row: status badge + Explore CTA */}
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <span className="border-border/80 text-foreground shadow-soft inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("badge")}
          </span>
          <Link
            href="/tools"
            className="bg-brand-gradient shadow-glow hover:shadow-glow-sm text-foreground inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            {t("exploreCta")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
