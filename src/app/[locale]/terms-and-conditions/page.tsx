import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import TermsContent, { lastUpdated, PLAIN_ENGLISH } from "@/content/legal/terms-and-conditions";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "Review the terms governing your use of Widgetly.",
  path: "/terms-and-conditions",
});

const RELATED = [
  {
    label: "Privacy Policy",
    href: "/privacy-policy",
    description: "How we collect, store, and protect your information.",
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

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The rules that govern your use of Widgetly. Plain-English summary at the top — the legal version below."
      toc={[
        { id: "acceptance", label: "Acceptance of terms" },
        { id: "description", label: "Description of the service" },
        { id: "eligibility", label: "Eligibility & accounts" },
        { id: "acceptable-use", label: "Acceptable use" },
        { id: "intellectual-property", label: "Intellectual property" },
        { id: "user-content", label: "Your content" },
        { id: "third-party", label: "Third-party services" },
        { id: "disclaimer", label: "Disclaimers" },
        { id: "liability", label: "Limitation of liability" },
        { id: "indemnification", label: "Indemnification" },
        { id: "termination", label: "Termination" },
        { id: "changes", label: "Changes" },
        { id: "governing-law", label: "Governing law" },
        { id: "contact", label: "Contact" },
      ]}
      plainEnglish={PLAIN_ENGLISH}
      related={RELATED}
      lastUpdated={lastUpdated}
    >
      <TermsContent />
    </LegalLayout>
  );
}
