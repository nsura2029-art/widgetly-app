import LegalLayout from "@/components/legal/LegalLayout";
import PrivacyContent, { lastUpdated } from "@/content/legal/privacy-policy";

export const metadata = {
  title: "Privacy Policy | Widgetly",
  description: "Learn how Widgetly handles your data and privacy.",
};

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use-information", label: "How We Use Information" },
  { id: "data-storage", label: "Data Storage" },
  { id: "third-party-services", label: "Third-Party Services" },
  { id: "user-rights", label: "User Rights" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="Learn how Widgetly collects, stores, and protects your information." toc={TOC} lastUpdated={lastUpdated}>
      <PrivacyContent />
    </LegalLayout>
  );
}
