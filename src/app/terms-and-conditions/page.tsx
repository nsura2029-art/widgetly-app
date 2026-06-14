import type { Metadata } from "next";
import LegalLayout from "@/components/legal/LegalLayout";
import TermsContent, { lastUpdated } from "@/content/legal/terms-and-conditions";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "Review the terms governing your use of Widgetly.",
  path: "/terms-and-conditions",
});

const TOC = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "use-of-services", label: "Use of Services" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "user-responsibilities", label: "User Responsibilities" },
  { id: "disclaimer", label: "Disclaimer" },
  { id: "limitation", label: "Limitation of Liability" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      subtitle="Review the terms governing your use of Widgetly."
      toc={TOC}
      lastUpdated={lastUpdated}
    >
      <TermsContent />
    </LegalLayout>
  );
}
