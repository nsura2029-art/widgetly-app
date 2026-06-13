import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import {
  buildMetadata,
  VIEWPORT,
  websiteJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  faqJsonLd,
} from "@/lib/seo";
import { FAQS } from "@/lib/constants";
import "./globals.css";
import ClientHeader from "@/components/layout/client-header";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { Footer } from "@/components/layout/footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = VIEWPORT;

const jsonLdWebSite = websiteJsonLd();
const jsonLdOrg = organizationJsonLd();
const jsonLdApp = softwareApplicationJsonLd();
const jsonLdFaq = faqJsonLd(FAQS);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for any future third-party origins (analytics, ads). */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
        <script
          type="application/ld+json"
          // Server-rendered JSON-LD; no user input, no XSS surface.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
        >
          Skip to content
        </a>
        <ClientHeader />
        <BreadcrumbNav />
        <main id="main" className="pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
