import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seo-schemas";
import { SITE_CONFIG } from "@/lib/constants";
import { SUGGESTIONS, statusLabel } from "@/lib/suggestions-seed";
import { SuggestClient } from "./suggest-client";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { readTopSuggestions } from "@/lib/supabase/suggestions";

export const metadata: Metadata = buildMetadata({
  title: "Suggest a Tool",
  description:
    "Tell us what to build next. The most-requested tools from the Widgetly community ship first — your idea could be one of them.",
  path: "/suggest",
  keywords: [
    "suggest a tool",
    "request a feature",
    "online tools feedback",
    "widgetly community",
    "tool roadmap",
  ],
});

const jsonLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_CONFIG.url },
  { name: "Suggest a Tool", url: `${SITE_CONFIG.url}/suggest` },
]);

/**
 * Top suggestions for the form's "Top requests" widget.
 *
 * Read path is layered:
 *  1. If Supabase is configured AND has rows, return those — this is
 *     the live, post-launch state.
 *  2. Otherwise, fall back to the static `SUGGESTIONS` seed list. The
 *     slug pages at `/suggest/[slug]` continue to be pre-rendered from
 *     the same seed; the form's leaderboard widget reads from here
 *     so the two stay aligned during the pre-launch window when the
 *     live DB is empty.
 *
 * The function is async because the live read is an HTTP round-trip
 * to Supabase. Per-request, not SSG — the page is therefore
 * `dynamic = "force-dynamic"`. Cost is a single indexed read of a
 * pre-materialized view; latency is sub-100ms in practice.
 */
async function getTopSuggestions(limit = 4) {
  if (isSupabaseConfigured()) {
    const live = await readTopSuggestions(limit);
    if (live.length > 0) {
      return live.map((s) => ({
        slug: s.slug,
        name: s.name,
        voteCount: s.voteCount,
        pitch: s.pitch,
        // The seed list has a friendly label per status; the live DB
        // stores the raw status. We adapt on the read side so the
        // client component's prop shape is unchanged.
        statusLabel: statusLabel(s.status as Parameters<typeof statusLabel>[0]),
      }));
    }
  }
  // Fallback (also used when Supabase isn't configured yet).
  return SUGGESTIONS.slice()
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, limit)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      voteCount: s.voteCount,
      pitch: s.pitch,
      statusLabel: statusLabel(s.status),
    }));
}

// Per-request render — the live read requires a fresh server response.
// SSR cost is one indexed Supabase query (or no query at all in the
// seed-fallback path), so the wall-clock hit is small.
export const dynamic = "force-dynamic";

export default async function SuggestPage() {
  const topSuggestions = await getTopSuggestions(4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SuggestClient topSuggestions={topSuggestions} />
    </>
  );
}
