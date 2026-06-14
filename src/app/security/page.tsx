import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import SecurityContent, { lastUpdated } from "@/content/legal/security";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Security",
  description: "Learn how Widgetly protects user data and platform integrity.",
  path: "/security",
});

const TOC = [
  { id: "overview", label: "Security Overview" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "data-protection", label: "Data Protection" },
  { id: "monitoring", label: "Monitoring" },
  { id: "disclosure", label: "Responsible Disclosure" },
  { id: "reporting", label: "Reporting Security Issues" },
];

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security"
      subtitle="Learn how Widgetly protects user data and platform integrity."
      toc={TOC}
      lastUpdated={lastUpdated}
    >
      <SecurityContent />
    </LegalLayout>
  );
}
