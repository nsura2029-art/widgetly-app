import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import CookiesContent, { lastUpdated } from "@/content/legal/cookies-policy";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cookies Policy",
  description: "Understand how Widgetly uses cookies and similar technologies.",
  path: "/cookies-policy",
});

const TOC = [
  { id: "what-are-cookies", label: "What Are Cookies" },
  { id: "cookies-we-use", label: "Cookies We Use" },
  { id: "managing-cookies", label: "Managing Cookies" },
  { id: "third-party-cookies", label: "Third-Party Cookies" },
  { id: "updates", label: "Updates" },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookies Policy"
      subtitle="Understand how Widgetly uses cookies and similar technologies."
      toc={TOC}
      lastUpdated={lastUpdated}
    >
      <CookiesContent />
    </LegalLayout>
  );
}
