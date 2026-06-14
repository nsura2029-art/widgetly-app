"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Clock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 2000;

type ContactLine = {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
};

const CONTACT_LINES: readonly ContactLine[] = [
  {
    icon: Mail,
    label: "Email",
    value: SITE_CONFIG.email,
    href: `mailto:${SITE_CONFIG.email}`,
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Brooklyn, NY · Remote-first",
  },
  {
    icon: Clock,
    label: "Response time",
    value: "Within 1 business day",
  },
];

/**
 * Small avatar cluster used as the "user hook" on the form. Three
 * overlapping gradient circles with initials + an "and friends" dot
 * imply a real team reads these messages. Sits just under the form
 * heading so the trust signal lands at the moment of commitment.
 */
function TeamReplyHook() {
  const members = [
    { initials: "NS", gradient: "from-primary to-secondary" },
    { initials: "AK", gradient: "from-secondary to-accent" },
    { initials: "MR", gradient: "from-accent to-primary" },
  ] as const;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
      <div className="flex -space-x-2">
        {members.map((m) => (
          <span
            key={m.initials}
            aria-hidden="true"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white",
              "bg-gradient-to-br",
              m.gradient
            )}
          >
            {m.initials}
          </span>
        ))}
      </div>
      <div className="flex-1 text-xs leading-tight">
        <p className="text-foreground font-medium">From the Widgetly team</p>
        <p className="text-muted flex items-center gap-1.5">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Online now · typically replies in 4 hours
        </p>
      </div>
    </div>
  );
}

export function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const messageCount = message.length;
  const messageNearLimit = messageCount > MAX_MESSAGE_LENGTH * 0.9;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !message.trim()) {
      setError("Please add your name and a message before sending.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please add a valid email so we can reply.");
      return;
    }
    // TODO (post-launch): POST to /api/contact. For now the form is a
    // no-op success state — we don't lie about a queue that doesn't
    // exist, but we also don't have a backend to forward to yet.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <PageShell width="wide">
        <div className="border-border/60 shadow-soft mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center sm:p-10">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Thanks — message received</h1>
          <p className="text-muted mt-3 text-sm">
            We&apos;ll get back to you at{" "}
            <span className="text-foreground font-medium">{email}</span> within one business day.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <div className="grid items-start gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Left column — pitch + contact details */}
        <div className="flex flex-col">
          <Badge variant="secondary" className="self-start">
            Contact
          </Badge>

          <h1 className="text-foreground mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Let&apos;s talk about
            <br />
            what you&apos;re building.
          </h1>

          <p className="text-muted mt-5 max-w-md text-base leading-relaxed">
            Whether you&apos;re evaluating Widgetly for your team, planning a launch, or just want
            to say hi — we read every message and reply within one business day.
          </p>

          <ul className="mt-10 space-y-5">
            {CONTACT_LINES.map(({ icon: Icon, label, value, href }) => {
              const inner = (
                <>
                  <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-foreground text-sm font-semibold">{label}</span>
                    <span className="text-muted text-sm">{value}</span>
                  </span>
                </>
              );
              return (
                <li key={label}>
                  {href ? (
                    <a
                      href={href}
                      className="group hover:text-primary flex items-center gap-4 transition-colors"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="flex items-center gap-4">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right column — form card */}
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
          <h2 className="text-foreground text-xl font-semibold">Send us a message</h2>
          <p className="text-muted mt-1.5 text-sm">
            Fill in the form and we&apos;ll get back to you shortly.
          </p>

          <TeamReplyHook />

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                Your name
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
              <p className="text-muted mt-1.5 text-xs">
                We need this to reply to you. We&apos;ll never share it.
              </p>
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                rows={5}
                required
                placeholder="Tell us a bit about your project or question…"
                className={cn(
                  "border-border shadow-soft flex w-full rounded-xl border bg-white px-4 py-3 text-sm",
                  "placeholder:text-muted/70 resize-y transition-all duration-200",
                  "focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none"
                )}
              />
              <p
                className={cn(
                  "mt-1.5 text-right text-xs tabular-nums",
                  messageNearLimit ? "text-amber-600" : "text-muted"
                )}
              >
                {messageCount}/{MAX_MESSAGE_LENGTH} characters
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-muted text-xs">
                By submitting, you agree to our{" "}
                <Link
                  href="/privacy-policy"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  privacy policy
                </Link>
                .
              </p>
              <Button type="submit" size="lg" className="shrink-0 px-6">
                Send message
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
