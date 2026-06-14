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
 * are translated; the category names themselves come from the CATEGORIES
 * constant and fall back to English for now (Phase 2 translation pass).
 */
export function Categories() {
  const t = useTranslations("home.categories");
  return (
    <section
      id="categories"
      className="relative border-t border-border/60 bg-muted/5 py-12 sm:py-16 lg:py-20"
      aria-labelledby="categories-title"
    >
      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border/80 bg-white px-3 py-1 text-xs font-medium text-muted shadow-soft">
            {t("pill")}
          </span>
          <h2
            id="categories-title"
            className="mt-4 text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            {t("subtitle")}
          </p>
        </FadeIn>

        <Stagger
          className="mt-14 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:mt-20 lg:grid-cols-5 lg:gap-5"
          stagger={0.05}
        >
          {CATEGORIES.map((category) => {
            const Icon = getIcon(category.icon);
            const accent = ACCENT_STYLES[category.accent];
            return (
              <StaggerItem key={category.name}>
                <Link
                  href={category.href}
                  className="group block focus:outline-none"
                  aria-label={`Explore ${category.name} — ${category.count} tools planned`}
                >
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                      "relative h-full overflow-hidden rounded-2xl border border-border/80 bg-white p-5 shadow-soft transition-all",
                      "hover:border-transparent hover:shadow-soft-lg"
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
                        className="h-4 w-4 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold tracking-tight text-foreground">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {category.description}
                    </p>

                    <div className="mt-4 flex items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          "font-mono font-semibold tabular-nums",
                          accent.text
                        )}
                      >
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
