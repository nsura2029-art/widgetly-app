import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seo-schemas";
import { SITE_CONFIG } from "@/lib/constants";
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

export default function SuggestPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SuggestClient />
    </>
  );
}
