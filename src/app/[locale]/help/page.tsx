import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  MessageCircle,
  BookOpen,
  Mail,
  ChevronRight,
  Sparkles,
  LifeBuoy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { buildMetadata, faqJsonLd } from "@/lib/seo";
import { SITE_CONFIG } from "@/lib/constants";

type HelpSection = {
  icon: typeof BookOpen;
  title: string;
  body: string;
  href: string;
  external?: boolean;
};

const HELP_SECTIONS: readonly HelpSection[] = [
  {
    icon: BookOpen,
    title: "Getting started",
    body: "New to Widgetly? Learn the basics in under five minutes — what the categories are, how search works, and where to start.",
    href: "/blog",
  },
  {
    icon: Search,
    title: "Search the docs",
    body: "Looking for a specific feature? Try the in-page search or jump straight to the category page that fits your task.",
    href: "/tools",
  },
  {
    icon: MessageCircle,
    title: "Ask the community",
    body: "Other builders and creators in the Widgetly community are often the fastest path to an answer. Start a thread in our Discord.",
    href: SITE_CONFIG.github,
    external: true,
  },
  {
    icon: Mail,
    title: "Email support",
    body: "Need a human reply? Drop us a line — we read every message and usually respond within one business day.",
    href: "/contact",
  },
];

const FAQS = [
  {
    question: "Is Widgetly free to use?",
    answer:
      "Yes. The full tool library is free during launch. Premium tiers with higher limits and team features are planned, but the free tier will always include the core tools.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account is required for the vast majority of tools. Sign-in is optional and only needed if you want to save history, sync across devices, or use team workspaces.",
  },
  {
    question: "Where does my data go?",
    answer:
      "Most tools run entirely in your browser — your files never leave your device. The few tools that need server processing are encrypted in transit, used once, and deleted immediately. See our privacy policy for details.",
  },
  {
    question: "Can I suggest a tool?",
    answer:
      "Absolutely. The most-requested tools ship next, so head to the Suggest page and tell us what you'd like to see.",
  },
  {
    question: "How do I report a bug?",
    answer:
      "Open an issue on GitHub for the fastest response, or use the contact form for anything sensitive. Please include the tool name, the URL you were on, and a quick description of the problem.",
  },
  {
    question: "Does Widgetly work on mobile?",
    answer:
      "Yes. Every tool is mobile-first responsive. The hero search and most categories work on touch; PDF and image tools are optimized for small screens.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: "Help & Support",
  description:
    "Get help with Widgetly: search the docs, ask the community, email support, or browse the most-asked questions. We read every message and reply within one business day.",
  path: "/help",
  keywords: [
    "widgetly help",
    "widgetly support",
    "online tools help",
    "free tools faq",
    "widgetly documentation",
  ],
});

const faqSchema = faqJsonLd(FAQS);

export default function HelpPage() {
  return (
    <PageShell width="wide" asArticle>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="flex flex-col items-start">
        <Badge variant="secondary" className="self-start">
          Help center
        </Badge>
        <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          How can we help?
        </h1>
        <p className="text-muted mt-5 max-w-2xl text-base leading-relaxed">
          Search the docs, ask the community, or drop us a line. We read every message and reply
          within one business day.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {HELP_SECTIONS.map(({ icon: Icon, title, body, href, external }) => {
          const inner = (
            <>
              <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h2 className="text-foreground text-lg font-semibold">{title}</h2>
                <p className="text-muted mt-1 text-sm leading-relaxed">{body}</p>
              </div>
              <ChevronRight
                className="text-muted h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          );
          return (
            <Link
              key={title}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group border-border/60 hover:border-primary/40 shadow-soft hover:shadow-soft-lg flex items-start gap-4 rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5"
            >
              {inner}
            </Link>
          );
        })}
      </div>

      {/* FAQ */}
      <section className="mt-16">
        <div className="flex items-center gap-3">
          <LifeBuoy className="text-primary h-5 w-5" aria-hidden="true" />
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="divide-border/60 border-border/60 shadow-soft mt-6 divide-y rounded-2xl border bg-white">
          {FAQS.map((f) => (
            <details key={f.question} className="group p-5">
              <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                <span>{f.question}</span>
                <ChevronRight
                  className="text-muted h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <p className="text-muted mt-3 text-sm leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="border-primary/20 bg-primary/5 mt-12 rounded-2xl border p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="bg-primary/15 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-foreground text-lg font-semibold">Still stuck?</h2>
              <p className="text-muted text-sm">
                Send us a note and we&apos;ll get back to you within one business day.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
