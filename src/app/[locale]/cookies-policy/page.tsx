import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import CookiesContent, { lastUpdated, PLAIN_ENGLISH } from "@/content/legal/cookies-policy";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cookies Policy",
  description: "Understand how Widgetly uses cookies and similar technologies.",
  path: "/cookies-policy",
});

const RELATED = [
  {
    label: "Privacy Policy",
    href: "/privacy-policy",
    description: "How we collect, store, and protect your information.",
  },
  {
    label: "Terms of Service",
    href: "/terms-and-conditions",
    description: "The rules governing your use of Widgetly.",
  },
  {
    label: "Security",
    href: "/security",
    description: "How we protect your data and the Service.",
  },
  {
    label: "Data Processing Agreement",
    href: "/dpa",
    description: "If you process data on behalf of your users, this is for you.",
  },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookies Policy"
      subtitle="Every cookie Widgetly sets, what it does, and how long it lasts. The full list is in the table below."
      toc={[
        { id: "what-are-cookies", label: "What are cookies" },
        { id: "cookies-we-use", label: "Cookies we use" },
        { id: "types-of-cookies", label: "Types of cookies" },
        { id: "third-party", label: "Third-party cookies" },
        { id: "managing", label: "Managing cookies" },
        { id: "do-not-track", label: "Do not track" },
        { id: "updates", label: "Updates" },
        { id: "contact", label: "Contact" },
      ]}
      plainEnglish={PLAIN_ENGLISH}
      related={RELATED}
      lastUpdated={lastUpdated}
    >
      <CookiesContent />
    </LegalLayout>
  );
}
