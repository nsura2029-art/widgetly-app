"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { getIcon } from "@/lib/icons";
import { FEATURES } from "@/lib/constants";
import { ACCENT_STYLES } from "@/components/shared/accent";
import { FadeIn } from "@/components/shared/fade-in";
import { Stagger, StaggerItem } from "@/components/shared/stagger";
import { cn } from "@/lib/utils";

/**
 * Features preview — six core value props in a responsive grid.
 * Each card renders its title/description from the
 * `home.features.items.*` namespace in the messages bundle, keyed by
 * `feature.id` (e.g. "aiSearch" → `home.features.items.aiSearch.title`).
 * The FEATURES constant carries only data (icon + accent + id) so the
 * copy stays translatable per locale without a code change.
 */
export function Features() {
  const t = useTranslations("home.features");
  return (
    <section
      id="features"
      className="relative py-12 sm:py-16 lg:py-20"
      aria-labelledby="features-title"
    >
      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2
            id="features-title"
            className="text-display-sm text-foreground sm:text-display-md font-semibold tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="text-muted mt-4 text-base sm:text-lg">{t("subtitle")}</p>
        </FadeIn>

        <Stagger
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-6"
          stagger={0.08}
        >
          {FEATURES.map((feature) => {
            const Icon = getIcon(feature.icon);
            const accent = ACCENT_STYLES[feature.accent];
            return (
              <StaggerItem key={feature.id}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={cn(
                    "group border-border/80 shadow-soft relative h-full overflow-hidden rounded-2xl border bg-white p-6 transition-shadow",
                    "hover:shadow-soft-lg"
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      feature.accent === "primary" && "ring-primary/30 ring-1",
                      feature.accent === "secondary" && "ring-secondary/30 ring-1",
                      feature.accent === "accent" && "ring-accent/30 ring-1"
                    )}
                  />

                  <div
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                      accent.iconBg
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-foreground mt-5 text-base font-semibold tracking-tight">
                    {t(`items.${feature.id}.title`)}
                  </h3>
                  <p className="text-muted mt-2 text-sm leading-relaxed">
                    {t(`items.${feature.id}.description`)}
                  </p>

                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute -right-px -bottom-px h-12 w-12 rounded-tl-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      feature.accent === "primary" &&
                        "from-primary/15 bg-gradient-to-tl to-transparent",
                      feature.accent === "secondary" &&
                        "from-secondary/15 bg-gradient-to-tl to-transparent",
                      feature.accent === "accent" &&
                        "from-accent/15 bg-gradient-to-tl to-transparent"
                    )}
                  />
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
