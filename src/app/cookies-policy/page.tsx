import LegalLayout from "@/components/legal/LegalLayout";
import CookiesContent, { lastUpdated } from "@/content/legal/cookies-policy";

export const metadata = {
  title: "Cookies Policy | Widgetly",
  description: "Understand how Widgetly uses cookies and similar technologies.",
};

const TOC = [
  { id: "what-are-cookies", label: "What Are Cookies" },
  { id: "cookies-we-use", label: "Cookies We Use" },
  { id: "managing-cookies", label: "Managing Cookies" },
  { id: "third-party-cookies", label: "Third-Party Cookies" },
  { id: "updates", label: "Updates" },
];

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookies Policy" subtitle="Understand how Widgetly uses cookies and similar technologies." toc={TOC} lastUpdated={lastUpdated}>
      <CookiesContent />
    </LegalLayout>
  );
}
