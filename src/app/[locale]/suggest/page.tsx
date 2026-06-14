import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seo-schemas";
import { SITE_CONFIG } from "@/lib/constants";
import { SUGGESTIONS, statusLabel } from "@/lib/suggestions-seed";
import { SuggestClient } from "./suggest-client";

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
 * Top suggestions for the form's "Top requests" widget. The same
 * dataset powers the static `/suggest/[slug]` pages; once a
 * persistence layer is wired up, the leaderboard here will
 * read from a live source while the slug pages continue to be
 * pre-rendered from the seed list.
 */
function getTopSuggestions(limit = 4) {
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

export default function SuggestPage() {
  const topSuggestions = getTopSuggestions(4);

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
