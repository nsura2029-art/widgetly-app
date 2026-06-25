import * as React from "react";
import { Award, ArrowUpRight, Sprout } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FadeIn } from "@/components/shared/fade-in";
import { Stagger, StaggerItem } from "@/components/shared/stagger";

/**
 * "Current Missions" — a two-card strip below the hero banner that
 * highlights the easiest available rewards so first-time visitors see
 * what they unlock just by participating. Acts as a stepping stone
 * between the hero CTA and the deeper reward preview on the
 * `/suggest/new` page.
 *
 * Each card shows: icon • title • reward pill • supporting line.
 * No interactive state — pure static. The reward pills use the same
 * sky/violet/emerald accent palette as the rest of the landing so the
 * visual rhythm (sky → violet → emerald) carries through the funnel:
 *
 *   Home:     Current Missions (2 cards: sky / violet)
 *   /suggest/new RewardPreview (3 cards: sky / violet / emerald)
 *
 * Sky     → first-step rewards ("easy")
 * Violet  → traction rewards ("popular")
 * Emerald → cash rewards ("premium") — only shown deeper in the funnel
 */
type Mission = {
  iconKey: "submission" | "upvotes";
  titleKey: string;
  rewardKey: string;
  bodyKey: string;
  accent: {
    pill: string;
    iconBubble: string;
    iconRing: string;
    iconColor: string;
  };
};

const MISSIONS: readonly Mission[] = [
  {
    iconKey: "submission",
    titleKey: "missionsFirstTitle",
    rewardKey: "missionsFirstReward",
    bodyKey: "missionsFirstBody",
    accent: {
      pill: "bg-sky-500/10 text-sky-700 ring-sky-500/25",
      iconBubble: "bg-sky-500/10",
      iconRing: "ring-sky-500/30",
      iconColor: "text-sky-600",
    },
  },
  {
    iconKey: "upvotes",
    titleKey: "missionsUpvotesTitle",
    rewardKey: "missionsUpvotesReward",
    bodyKey: "missionsUpvotesBody",
    accent: {
      pill: "bg-violet-500/10 text-violet-700 ring-violet-500/25",
      iconBubble: "bg-violet-500/10",
      iconRing: "ring-violet-500/30",
      iconColor: "text-violet-600",
    },
  },
];

export async function CurrentMissions() {
  const t = await getTranslations("home.missions");

  return (
    <section
      aria-labelledby="current-missions-title"
      className="border-border/60 bg-muted/5 border-y py-10 sm:py-14 lg:py-16"
    >
      <div className="container">
        <FadeIn className="max-w-2xl">
          <span className="border-border/80 text-muted shadow-soft inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            {t("eyebrow")}
          </span>
          <h2
            id="current-missions-title"
            className="text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("title")}
          </h2>
          <p className="text-muted mt-2 text-sm sm:text-base">{t("subtitle")}</p>
        </FadeIn>

        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-5" stagger={0.06}>
          {MISSIONS.map((mission) => {
            const Icon = mission.iconKey === "submission" ? Award : Sprout;
            return (
              <StaggerItem key={mission.iconKey}>
                <article className="border-border/80 shadow-soft group hover:shadow-soft-lg relative h-full overflow-hidden rounded-2xl border bg-white p-6 transition-all">
                  <div className="flex items-start gap-4">
                    <div
                      className={`inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl ring-1 ${mission.accent.iconBubble} ${mission.accent.iconRing}`}
                    >
                      <Icon className={`h-6 w-6 ${mission.accent.iconColor}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground text-base font-semibold sm:text-lg">
                        {t(mission.titleKey)}
                      </h3>
                      <p className="text-muted mt-1 text-sm leading-relaxed">
                        {t(mission.bodyKey)}
                      </p>
                      <span
                        className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${mission.accent.pill}`}
                      >
                        {t(mission.rewardKey)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/suggest/new"
                    className="text-foreground mt-5 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {t("missionsCta")}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
