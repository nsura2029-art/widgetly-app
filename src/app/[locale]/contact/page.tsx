import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seo-schemas";
import { SITE_CONFIG } from "@/lib/constants";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Widgetly team. Whether you're evaluating Widgetly for your team, planning a launch, or have a question — we read every message and reply within one business day.",
  path: "/contact",
  keywords: [
    "contact widgetly",
    "widgetly support",
    "online tools support",
    "free tools contact",
    "widgetly email",
  ],
});

const jsonLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_CONFIG.url },
  { name: "Contact", url: `${SITE_CONFIG.url}/contact` },
]);

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContactClient />
    </>
  );
}
