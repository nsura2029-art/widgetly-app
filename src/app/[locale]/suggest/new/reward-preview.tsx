/**
 * RewardPreview — the right-column card on the /suggest/new page that
 * shows what a submitter earns at each milestone:
 *  - Tier 1 (Submission): +50 Wits + Newbie Badge
 *  - Tier 2 (50 upvotes): Viral Idea Badge + 500 Wits
 *  - Tier 3 (Goes Live): $50–$500 one-time + 5-15% profit share
 *
 * Why a separate component:
 *  - Server component (uses `getTranslations` from `next-intl/server`).
 *    Keeping it on the server means zero client JS for the rewards card
 *    and no hydration boundary between it and the rest of the page.
 *  - The three "tier" rows share enough structure that a small data
 *    array + .map() keeps the markup readable and copy tweaks easy
 *    to make in one place.
 *
 * The card is sticky on desktop (`lg:sticky lg:top-24`) so it stays
 * visible while the user scrolls the long form — the "contextual
 * nudge" pattern: keep the upside in the user's eye-line while
 * they're filling in the fields that earn it.
 */

import { Coins, Rocket, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";

type RewardTier = {
  iconKey: "submission" | "upvotes" | "live";
  titleKey: "rewardsTier1Title" | "rewardsTier2Title" | "rewardsTier3Title";
  bodyKey: "rewardsTier1Body" | "rewardsTier2Body" | "rewardsTier3Body";
  /** Tailwind accent — used for the icon bubble bg + ring + accent line. */
  accent: {
    bubble: string;
    ring: string;
    text: string;
    line: string;
  };
};

const TIERS: readonly RewardTier[] = [
  {
    iconKey: "submission",
    titleKey: "rewardsTier1Title",
    bodyKey: "rewardsTier1Body",
    // Sky = first-time welcome (matches the "blue chip" feel of a starter reward)
    accent: {
      bubble: "bg-sky-500/10",
      ring: "ring-sky-500/25",
      text: "text-sky-600",
      line: "from-sky-500/0 via-sky-500/40 to-sky-500/0",
    },
  },
  {
    iconKey: "upvotes",
    titleKey: "rewardsTier2Title",
    bodyKey: "rewardsTier2Body",
    // Violet = momentum / upvote storm
    accent: {
      bubble: "bg-violet-500/10",
      ring: "ring-violet-500/25",
      text: "text-violet-600",
      line: "from-violet-500/0 via-violet-500/40 to-violet-500/0",
    },
  },
  {
    iconKey: "live",
    titleKey: "rewardsTier3Title",
    bodyKey: "rewardsTier3Body",
    // Emerald = paid / "live" — matches the green CTA at the bottom of the form
    accent: {
      bubble: "bg-emerald-500/10",
      ring: "ring-emerald-500/25",
      text: "text-emerald-600",
      line: "from-emerald-500/0 via-emerald-500/40 to-emerald-500/0",
    },
  },
] as const;

export async function RewardPreview() {
  const t = await getTranslations("suggest.formNew");

  return (
    <aside
      aria-labelledby="rewards-heading"
      className="border-border/60 shadow-soft from-primary/5 via-secondary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br to-emerald-500/5 p-6 lg:sticky lg:top-24 lg:p-7"
    >
      {/* Decorative top-right glow — small accent that ties the card to the
          green CTA below without being loud. Purely cosmetic. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl"
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-emerald-600 uppercase ring-1 ring-emerald-500/20">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t("rewardsTitle")}
          </span>
        </div>
        <h2
          id="rewards-heading"
          className="text-foreground mt-3 text-xl font-semibold tracking-tight sm:text-2xl"
        >
          {t("rewardsTitle")}
        </h2>
        <p className="text-muted mt-2 text-sm leading-relaxed">{t("rewardsSubtitle")}</p>

        {/* Tier list */}
        <ol className="mt-6 flex flex-col gap-4">
          {TIERS.map((tier, index) => (
            <li key={tier.iconKey} className="relative">
              {/* Connector line between tiers — fades in/out so it doesn't
                  look like a hard pipe. Only rendered between siblings. */}
              {index < TIERS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-11 left-[1.625rem] h-[calc(100%+0.5rem-2.75rem)] w-px bg-gradient-to-b ${tier.accent.line}`}
                />
              )}
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tier.accent.bubble} ${tier.accent.ring} ${tier.accent.text}`}
                  aria-hidden="true"
                >
                  <TierIcon iconKey={tier.iconKey} />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-foreground text-sm font-semibold">{t(tier.titleKey)}</p>
                  <p className="text-muted mt-0.5 text-xs leading-relaxed sm:text-sm">
                    {t(tier.bodyKey)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Footer hint — uses the same emerald accent to tie the card
            back to the CTA. Plain text so it doesn't compete with the
            tiers above. */}
        <div className="border-border/60 bg-background/60 mt-6 flex items-start gap-2 rounded-xl border p-3 text-xs">
          <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <p className="text-muted leading-relaxed">
            <span className="text-foreground font-semibold">3 tiers.</span> Every submission
            automatically qualifies for tier 1 — the rest unlock as your idea gains traction.
          </p>
        </div>
      </div>
    </aside>
  );
}

function TierIcon({ iconKey }: { iconKey: RewardTier["iconKey"] }) {
  switch (iconKey) {
    case "submission":
      // Coins = +50 Wits on submit
      return <Coins className="h-4 w-4" aria-hidden="true" />;
    case "upvotes":
      // TrendingUp = upvote momentum
      return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
    case "live":
      // Rocket = "Goes Live"
      return <Rocket className="h-4 w-4" aria-hidden="true" />;
  }
  // Fallback for safety — should never hit since the union is exhaustive.
  return <Coins className="h-4 w-4" aria-hidden="true" />;
}
