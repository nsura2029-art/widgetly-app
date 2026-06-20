import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import DpaContent, { lastUpdated, PLAIN_ENGLISH } from "@/content/legal/dpa";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Data Processing Agreement",
  description: "The contractual terms for processing data on your behalf under GDPR.",
  path: "/dpa",
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
    description: "The technical and organizational measures protecting your data.",
  },
];

export default function DpaPage() {
  return (
    <LegalLayout
      title="Data Processing Agreement"
      subtitle="If you use Widgetly to process personal data of your end users or employees, this DPA is the contract that defines our respective responsibilities under GDPR and similar laws."
      toc={[
        { id: "purpose", label: "Purpose" },
        { id: "roles", label: "Roles" },
        { id: "scope", label: "Scope of processing" },
        { id: "sub-processors", label: "Sub-processors" },
        { id: "security", label: "Security" },
        { id: "transfers", label: "International transfers" },
        { id: "sub-processing-changes", label: "Sub-processor changes" },
        { id: "your-rights", label: "Your rights as controller" },
        { id: "audits", label: "Audits" },
        { id: "incidents", label: "Incident notification" },
        { id: "termination", label: "Termination" },
        { id: "contact", label: "Contact" },
      ]}
      plainEnglish={PLAIN_ENGLISH}
      related={RELATED}
      lastUpdated={lastUpdated}
    >
      <DpaContent />
    </LegalLayout>
  );
}
