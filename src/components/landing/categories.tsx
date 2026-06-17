"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getIcon } from "@/lib/icons";
import { CATEGORIES } from "@/lib/constants";
import { ACCENT_STYLES } from "@/components/shared/accent";
import { FadeIn } from "@/components/shared/fade-in";
import { Stagger, StaggerItem } from "@/components/shared/stagger";
import { cn } from "@/lib/utils";

/**
 * Tool categories preview. Each card shows a future tool count so visitors
 * get a sense of the breadth we're shipping. The pill / title / subtitle
 * come from `home.categories.*`; the per-card name + short description
 * come from `categories.items.<slug>.name` and `.shortDesc`. The
 * CATEGORIES constant carries only data (slug, count, icon, href,
 * accent) so the copy stays translatable per locale.
 */
export function Categories() {
  const t = useTranslations("home.categories");
  const tCat = useTranslations("categories");
  return (
    <section
      id="categories"
      className="border-border/60 bg-muted/5 relative border-t py-6 sm:py-8 lg:py-10"
      aria-labelledby="categories-title"
    >
      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="border-border/80 text-muted shadow-soft inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium">
            {t("pill")}
          </span>
          <h2
            id="categories-title"
            className="text-display-sm text-foreground sm:text-display-md mt-4 font-semibold tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="text-muted mt-4 text-base sm:text-lg">{t("subtitle")}</p>
        </FadeIn>

        <Stagger
          className="mt-14 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:mt-20 lg:grid-cols-5 lg:gap-5"
          stagger={0.05}
        >
          {CATEGORIES.map((category) => {
            const Icon = getIcon(category.icon);
            const accent = ACCENT_STYLES[category.accent];
            const name = tCat(`items.${category.slug}.name`);
            const shortDesc = tCat(`items.${category.slug}.shortDesc`);
            return (
              <StaggerItem key={category.slug}>
                <Link
                  href={category.href}
                  className="group block focus:outline-none"
                  aria-label={`${name} \u2014 ${category.count}`}
                >
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                      "border-border/80 shadow-soft relative h-full overflow-hidden rounded-2xl border bg-white p-5 transition-all",
                      "hover:shadow-soft-lg hover:border-transparent"
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                        "bg-gradient-to-br",
                        category.accent === "primary" && "from-primary/5 to-transparent",
                        category.accent === "secondary" && "from-secondary/5 to-transparent",
                        category.accent === "accent" && "from-accent/5 to-transparent"
                      )}
                    />

                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                          accent.iconBg
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowUpRight
                        className="text-muted h-4 w-4 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </div>

                    <h3 className="text-foreground mt-4 text-sm font-semibold tracking-tight">
                      {name}
                    </h3>
                    <p className="text-muted mt-1 text-xs">{shortDesc}</p>

                    <div className="mt-4 flex items-center gap-1.5 text-xs">
                      <span className={cn("font-mono font-semibold tabular-nums", accent.text)}>
                        {category.count}
                      </span>
                      <span className="text-muted">{t("count")}</span>
                    </div>
                  </motion.div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
