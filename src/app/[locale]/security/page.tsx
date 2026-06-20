import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import SecurityContent, { lastUpdated, PLAIN_ENGLISH } from "@/content/legal/security";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Security",
  description: "How Widgetly protects user data and platform integrity.",
  path: "/security",
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
    label: "Data Processing Agreement",
    href: "/dpa",
    description: "The contractual terms for processing data on your behalf.",
  },
];

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security"
      subtitle="Widgetly is built on the assumption that any tool can fail or be attacked. Here's exactly how we protect your data and your session — and how to report anything that worries you."
      toc={[
        { id: "browser-side", label: "Browser-side processing" },
        { id: "auto-delete", label: "Auto-expiry" },
        { id: "scalable-edge", label: "Scalable edge network" },
        { id: "certified", label: "Certified infrastructure" },
        { id: "isolation", label: "Request isolation" },
        { id: "transport", label: "Secure communication" },
        { id: "no-signup", label: "No signup required" },
        { id: "gdpr", label: "EU data & GDPR" },
        { id: "session-binding", label: "Session-bound storage" },
        { id: "disclosure", label: "Responsible disclosure" },
      ]}
      plainEnglish={PLAIN_ENGLISH}
      related={RELATED}
      lastUpdated={lastUpdated}
    >
      <SecurityContent />
    </LegalLayout>
  );
}
