"use client";

import { motion } from "framer-motion";
import { getIcon } from "@/lib/icons";
import { FEATURES } from "@/lib/constants";
import { ACCENT_STYLES } from "@/components/shared/accent";
import { FadeIn } from "@/components/shared/fade-in";
import { Stagger, StaggerItem } from "@/components/shared/stagger";
import { cn } from "@/lib/utils";

/**
 * Features preview — six core value props in a responsive grid.
 * Hover effect: card lifts, border picks up the accent colour, and the
 * icon chip glows with the matching gradient.
 */
export function Features() {
  return (
    <section
      id="features"
      className="relative py-20 sm:py-28 lg:py-32"
      aria-labelledby="features-title"
    >
      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2
            id="features-title"
            className="text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md"
          >
            Everything You Need. Nothing You Don't.
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Powerful tools, lightning-fast results, and a seamless experience
            from start to finish.
          </p>
        </FadeIn>

        <Stagger
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-6"
          stagger={0.08}
        >
          {FEATURES.map((feature) => {
            const Icon = getIcon(feature.icon);
            const accent = ACCENT_STYLES[feature.accent];
            return (
              <StaggerItem key={feature.title}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={cn(
                    "group relative h-full overflow-hidden rounded-2xl border border-border/80 bg-white p-6 shadow-soft transition-shadow",
                    "hover:shadow-soft-lg"
                  )}
                >
                  {/* Hover gradient border glow */}
                  <div
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      feature.accent === "primary" && "ring-1 ring-primary/30",
                      feature.accent === "secondary" && "ring-1 ring-secondary/30",
                      feature.accent === "accent" && "ring-1 ring-accent/30"
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

                  <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>

                  {/* Bottom-right corner accent on hover */}
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute -bottom-px -right-px h-12 w-12 rounded-tl-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                      feature.accent === "primary" && "bg-gradient-to-tl from-primary/15 to-transparent",
                      feature.accent === "secondary" && "bg-gradient-to-tl from-secondary/15 to-transparent",
                      feature.accent === "accent" && "bg-gradient-to-tl from-accent/15 to-transparent"
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
