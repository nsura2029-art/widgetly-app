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
    label: "Terms & Conditions",
    href: "/terms-and-conditions",
    description: "The rules governing your use of Widgetly.",
  },
  {
    label: "Cookies Policy",
    href: "/cookies-policy",
    description: "The specific cookies we set and why.",
  },
];

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security"
      subtitle="How Widgetly protects user data and platform integrity — the architecture, the controls, and the disclosure program."
      toc={[
        { id: "overview", label: "Overview" },
        { id: "infrastructure", label: "Infrastructure" },
        { id: "encryption", label: "Encryption" },
        { id: "browser-side", label: "Browser-side tools" },
        { id: "server-side", label: "Server-side tools" },
        { id: "access-control", label: "Access controls" },
        { id: "monitoring", label: "Monitoring & detection" },
        { id: "incident-response", label: "Incident response" },
        { id: "disclosure", label: "Responsible disclosure" },
        { id: "compliance", label: "Compliance" },
        { id: "reporting", label: "Reporting" },
      ]}
      plainEnglish={PLAIN_ENGLISH}
      related={RELATED}
      lastUpdated={lastUpdated}
    >
      <SecurityContent />
    </LegalLayout>
  );
}
