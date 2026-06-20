import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import PrivacyContent, { lastUpdated, PLAIN_ENGLISH } from "@/content/legal/privacy-policy";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "Learn how Widgetly collects, stores, and protects your information.",
  path: "/privacy-policy",
});

const RELATED = [
  {
    label: "Terms of Service",
    href: "/terms-and-conditions",
    description: "The rules governing your use of Widgetly.",
  },
  {
    label: "Cookies Policy",
    href: "/cookies-policy",
    description: "The specific cookies we set and why.",
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

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Learn how Widgetly collects, stores, and protects your information."
      toc={[
        { id: "introduction", label: "Introduction" },
        { id: "information-we-collect", label: "Information we collect" },
        { id: "how-we-use-information", label: "How we use information" },
        { id: "data-storage", label: "Data storage & security" },
        { id: "third-party-services", label: "Third-party services" },
        { id: "your-rights", label: "Your rights" },
        { id: "international-transfers", label: "International transfers" },
        { id: "children", label: "Children's privacy" },
        { id: "changes", label: "Changes" },
        { id: "contact", label: "Contact" },
      ]}
      plainEnglish={PLAIN_ENGLISH}
      related={RELATED}
      lastUpdated={lastUpdated}
    >
      <PrivacyContent />
    </LegalLayout>
  );
}
