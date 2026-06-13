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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
      <body className="bg-background min-h-screen font-sans antialiased">
        <a
          href="#main"
          className="focus:bg-foreground focus:text-background sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <ClientHeader />
        {/*
          The root <main> is provided here exactly once. Pages must NOT
          wrap their content in another <main> - use <PageShell /> (or a
          Tailwind `.container` for the rare full-width case) instead.

          The sticky 64px header is cleared by `pt-16` on <main>. The
          breadcrumb lives INSIDE <main> at the top so it shares the
          same `.container` width as the page body (predictable
          alignment, important for future ad slots) and sits in a
          predictable place on every page, including the legal pages.
          The breadcrumb itself is hidden on the homepage.
        */}
        <main id="main" className="pt-16">
          <BreadcrumbNav />
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
