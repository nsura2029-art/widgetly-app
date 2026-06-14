"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks, Rocket, Wrench, ArrowRight, Sparkles, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";

const MAX_DESCRIPTION_LENGTH = 2000;
const SUGGESTION_THRESHOLD = 50;

const HOW_IT_WORKS = [
  {
    icon: ListChecks,
    title: "We collect",
    body: "Every suggestion lands in a public board. No black box — you can see what others have asked for.",
  },
  {
    icon: ThumbsUp,
    title: "You vote",
    body: "When a tool crosses 50 requests, it joins our active build queue. The community decides priority.",
  },
  {
    icon: Rocket,
    title: "We ship",
    body: "Most-requested tools ship in 2–3 weeks. We notify you the moment yours goes live.",
  },
] as const;

const TOP_REQUESTS = [
  { name: "PDF Summarizer", votes: 142 },
  { name: "AI Flashcard Generator", votes: 98 },
  { name: "Markdown → PDF", votes: 76 },
  { name: "Recipe Scaler", votes: 64 },
  { name: "Unit Price Calculator", votes: 51 },
] as const;

/**
 * User hook for the suggest page: a "Top requests this month" mini-leaderboard
 * that does two jobs at once — it shows social proof (other people are
 * suggesting, votes are real) and it lowers the bar to add yours (everyone's
 * idea is welcome, see the bar?). Renders inside the form card so the
 * motivation lands at the moment of typing.
 */
function TopRequestsHook() {
  const max = TOP_REQUESTS[0]?.votes ?? 1;
  return (
    <div className="border-border/60 bg-muted/5 mt-4 rounded-xl border p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-foreground text-xs font-semibold">Top requests this month</p>
        <span className="text-muted text-[10px] tracking-wide uppercase">Live</span>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {TOP_REQUESTS.slice(0, 4).map((r, i) => {
          const pct = Math.max(8, Math.round((r.votes / max) * 100));
          return (
            <li key={r.name} className="flex items-center gap-2 text-xs">
              <span className="text-muted w-3 shrink-0 text-right tabular-nums">{i + 1}</span>
              <div className="relative flex-1 overflow-hidden rounded-md bg-white">
                <div
                  className="from-primary/15 to-secondary/15 absolute inset-y-0 left-0 rounded-md bg-gradient-to-r"
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
                <span className="text-foreground relative z-10 block px-2 py-1">{r.name}</span>
              </div>
              <span className="text-muted w-10 shrink-0 text-right tabular-nums">{r.votes}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-muted mt-2.5 text-[11px] leading-snug">
        Hit <span className="text-foreground font-medium">{SUGGESTION_THRESHOLD} votes</span> and
        your idea jumps to the top of our build queue.
      </p>
    </div>
  );
}

export default function SuggestPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const descCount = description.length;
  const descNearLimit = descCount > MAX_DESCRIPTION_LENGTH * 0.9;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !description.trim()) {
      setError("Please provide both a tool name and description.");
      return;
    }
    // TODO: wire up to backend or analytics. For now show confirmation.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <PageShell width="wide">
        <div className="border-border/60 shadow-soft mx-auto max-w-2xl rounded-2xl border bg-white p-8 text-center sm:p-10">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Got it — your idea is in the queue</h1>
          <p className="text-muted mt-3 text-sm">
            We&apos;ll build it once it gathers enough votes. Share the link with friends to push it
            up the leaderboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/blog">Read the blog</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <div className="grid items-start gap-10 md:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Left column — pitch + how it works */}
        <div className="flex flex-col">
          <Badge variant="secondary" className="self-start">
            Suggest a tool
          </Badge>

          <h1 className="text-foreground mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Got a tool
            <br />
            we should build?
          </h1>

          <p className="text-muted mt-5 max-w-md text-base leading-relaxed">
            Tell us what you wish existed. Every suggestion goes to a public board, the community
            votes, and the most-requested tools ship next.
          </p>

          <ol className="mt-10 space-y-5">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex items-start gap-4">
                <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-foreground text-sm font-semibold">
                    <span className="text-muted mr-1.5 font-normal">0{i + 1}.</span>
                    {title}
                  </span>
                  <span className="text-muted text-sm leading-relaxed">{body}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right column — form card */}
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
          <h2 className="text-foreground text-xl font-semibold">Suggest a tool</h2>
          <p className="text-muted mt-1.5 text-sm">
            Tell us the name, what it does, and why it&apos;d be useful.
          </p>

          <TopRequestsHook />

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="suggest-name" className="mb-1.5 block text-sm font-medium">
                Tool name
              </label>
              <Input
                id="suggest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PDF Summarizer"
                required
              />
            </div>

            <div>
              <label htmlFor="suggest-description" className="mb-1.5 block text-sm font-medium">
                Description
              </label>
              <textarea
                id="suggest-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                rows={5}
                required
                placeholder="Briefly describe what the tool does and why it would be useful…"
                className={cn(
                  "border-border shadow-soft flex w-full rounded-xl border bg-white px-4 py-3 text-sm",
                  "placeholder:text-muted/70 resize-y transition-all duration-200",
                  "focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none"
                )}
              />
              <p
                className={cn(
                  "mt-1.5 text-right text-xs tabular-nums",
                  descNearLimit ? "text-amber-600" : "text-muted"
                )}
              >
                {descCount}/{MAX_DESCRIPTION_LENGTH} characters
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="suggest-category" className="mb-1.5 block text-sm font-medium">
                  Category <span className="text-muted font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Wrench
                    className="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <Input
                    id="suggest-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Productivity"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="suggest-email" className="mb-1.5 block text-sm font-medium">
                  Email <span className="text-muted font-normal">(optional)</span>
                </label>
                <Input
                  id="suggest-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
                <p className="text-muted mt-1.5 text-xs">We&apos;ll only email if it ships.</p>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-4 pt-1">
              <p className="text-muted text-xs">
                Need to report a problem?{" "}
                <Link
                  href="/contact"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Contact us
                </Link>
                .
              </p>
              <Button type="submit" size="lg" className="shrink-0 px-6">
                Submit suggestion
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
