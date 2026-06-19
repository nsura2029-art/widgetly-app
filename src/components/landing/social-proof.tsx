"use client";

import * as React from "react";
import {
  useInView,
  useMotionValue,
  useTransform,
  animate,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { Star, Users, Wrench, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { STATS } from "@/lib/constants";
import { FadeIn } from "@/components/shared/fade-in";
import { Stagger, StaggerItem } from "@/components/shared/stagger";

/**
 * Social proof band. Stars on GitHub, waitlist signups, planned tools,
 * and category count. Numbers animate from 0 to their target when the
 * section enters the viewport. Section title + stat labels are translated.
 */
export function SocialProof() {
  const t = useTranslations("home.socialProof");
  return (
    <section
      aria-labelledby="social-proof-title"
      className="border-border/60 bg-muted/5 relative border-t py-6 sm:py-8 lg:py-10"
    >
      <div className="container">
        <FadeIn>
          <h2
            id="social-proof-title"
            className="text-muted text-center text-xs font-medium tracking-wider uppercase"
          >
            {t("title")}
          </h2>
        </FadeIn>

        <Stagger className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4" stagger={0.1}>
          {(
            [
              {
                id: "tools",
                icon: <Wrench className="h-4 w-4" />,
                value: 500,
                suffix: "+",
                label: t("stats.tools"),
                accent: "text-primary",
              },
              {
                id: "categories",
                icon: <Layers className="h-4 w-4" />,
                value: 50,
                suffix: "+",
                label: t("stats.categories"),
                accent: "text-secondary",
              },
              {
                id: "stars",
                icon: <Star className="h-4 w-4" />,
                value: 2400,
                suffix: "+",
                label: t("stats.stars"),
                accent: "text-accent",
              },
              {
                id: "waitlist",
                icon: <Users className="h-4 w-4" />,
                value: 8500,
                suffix: "+",
                label: t("stats.waitlist"),
                accent: "text-primary",
              },
            ] as const
          ).map((stat) => (
            <Stat key={stat.id} {...stat} />
          ))}
        </Stagger>

        <FadeIn delay={0.3} className="mt-12 text-center">
          <p className="text-muted text-sm">
            {t.rich("footer", {
              freeTools: (
                <span className="text-foreground font-semibold">{STATS.freeTools}</span>
              ) as unknown as string,
              uptimeTarget: (
                <span className="text-foreground font-semibold">{STATS.uptimeTarget}</span>
              ) as unknown as string,
            })}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function Stat({
  icon,
  value,
  suffix,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  accent: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  React.useEffect(() => {
    if (inView) {
      const controls = animate(count, value, {
        duration: 1.8,
        ease: [0.16, 1, 0.3, 1],
      });
      return controls.stop;
    }
  }, [inView, value, count]);

  return (
    <StaggerItem>
      <div ref={ref} className="text-center">
        <div
          className={`border-border/80 shadow-soft mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${accent}`}
        >
          {icon}
        </div>
        <div className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          <CountUp value={rounded} />
          {suffix && <span className="text-foreground">{suffix}</span>}
        </div>
        <div className="text-muted mt-1 text-xs font-medium tracking-wider uppercase">{label}</div>
      </div>
    </StaggerItem>
  );
}

/**
 * Subscribes to a MotionValue<string> and renders its current value as
 * a plain React text child. Avoids "Objects are not valid as a React child"
 * by never letting a MotionValue reach React's renderer directly.
 *
 * SSR-safe: initializes from a stable fallback ("0") rather than calling
 * `value.get()` at render time. The fallback matches the server render, so
 * hydration sees no mismatch; the first `useMotionValueEvent` tick on the
 * client then pushes the real value without re-mounting the node.
 */
function CountUp({ value }: { value: MotionValue<string> }) {
  const [text, setText] = React.useState("0");
  React.useEffect(() => {
    // Sync to the current value as soon as we mount on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value.get());
  }, [value]);
  useMotionValueEvent(value, "change", (latest) => setText(latest));
  return <>{text}</>;
}
