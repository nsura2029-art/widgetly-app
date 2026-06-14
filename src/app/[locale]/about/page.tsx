import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { MapPin, Clock, Heart, Sparkles, ArrowRight, Briefcase, Users, Coffee } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { LandmarksCollage, LANDMARKS } from "@/components/about/landmarks-collage";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

// Build team cards directly from the landmarks roster so the imagery on
// the page stays in sync with the collage above (one landmark per team
// member).
const TEAM = LANDMARKS.map((l, i) => ({
  name:
    [
      "Ava Martinez",
      "Daniel Kim",
      "Maya Singh",
      "Ethan Walker",
      "Sofia Alvarez",
      "Liam Chen",
      "Priya Patel",
      "Noah Brooks",
      "Zoe Reyes",
    ][i] ?? `Member ${i + 1}`,
  role:
    [
      "Product Lead",
      "Engineering Lead",
      "AI & Data",
      "Design",
      "Operations & Security",
      "Mobile & Growth",
      "Platform",
      "Customer Success",
      "Marketing",
    ][i] ?? "Team Member",
  bio:
    [
      "Designs delightful, reliable product experiences that scale.",
      "Builds resilient systems and developer tooling.",
      "Applies machine learning to make tools faster and smarter.",
      "Crafts clear interfaces focused on speed and simplicity.",
      "Keeps data safe and systems reliable.",
      "Brings Widgetly to every device, every workflow.",
      "Turns infrastructure into a product people love.",
      "Listens to customers and turns feedback into shippable wins.",
      "Tells the story of tools that just work.",
    ][i] ?? "Building dependable tools for everyone.",
  landmark: l,
}));

// Three concrete "how we work" tiles that give the join-us CTA real
// substance. Each is one line of intent + one line of detail.
const HOW_WE_WORK = [
  {
    icon: Users,
    title: "Small, senior, async",
    body: "Everyone on the team has deep experience and owns their work end-to-end. We write things down so context isn't lost across time zones.",
  },
  {
    icon: MapPin,
    title: "Fully remote",
    body: "Work from wherever you're most productive. We overlap a few hours with US Eastern for the team that wants it; the rest is async.",
  },
  {
    icon: Clock,
    title: "Sensible hours",
    body: 'We protect focus time and respect evenings and weekends. Tools that "just work" start with a team that isn\'t burned out.',
  },
  {
    icon: Heart,
    title: "Pay transparency",
    body: "Salary bands are public within the company and tied to role and experience, not negotiation. The same role pays the same, anywhere.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: "About Us",
  description:
    "Widgetly is built by a small remote-first team in Brooklyn, NY. Our mission is to bring together every online tool you actually use in one fast, private, mobile-first platform.",
  path: "/about",
  keywords: ["about widgetly", "widgetly team", "free online tools platform", "company"],
});

export default function AboutPage() {
  return (
    <PageShell width="default">
      {/* Hero card */}
      <header className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
        <Badge variant="secondary" className="self-start">
          About Widgetly
        </Badge>
        <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Tools that respect your time.
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed sm:text-lg">
          Simple, secure, and reliable online tools to help you work better and faster. We focus on
          removing friction so you can focus on what matters most.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/tools">
              Browse all tools
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/#waitlist">Join the waitlist</Link>
          </Button>
        </div>
      </header>

      {/* Ethos / Mission */}
      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-foreground text-lg font-semibold">Our ethos</h2>
          </div>
          <ul className="text-muted mt-4 space-y-2.5 text-sm leading-relaxed">
            <li>
              <strong className="text-foreground font-medium">Simple.</strong> Tools that just work,
              without noise.
            </li>
            <li>
              <strong className="text-foreground font-medium">Secure.</strong> Privacy-first
              defaults and careful data handling.
            </li>
            <li>
              <strong className="text-foreground font-medium">Reliable.</strong> Fast, resilient
              performance at scale.
            </li>
          </ul>
        </div>

        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="bg-secondary/10 text-secondary flex h-8 w-8 items-center justify-center rounded-lg">
              <Briefcase className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-foreground text-lg font-semibold">Our mission</h2>
          </div>
          <ul className="text-muted mt-4 space-y-2.5 text-sm leading-relaxed">
            <li>
              <strong className="text-foreground font-medium">Help.</strong> Help people work better
              and faster.
            </li>
            <li>
              <strong className="text-foreground font-medium">Reduce.</strong> Reduce repetitive
              tasks through smart automation.
            </li>
            <li>
              <strong className="text-foreground font-medium">Democratize.</strong> Make powerful
              tools accessible to everyone.
            </li>
          </ul>
        </div>
      </section>

      {/* Landmarks */}
      <section className="mt-12">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Iconic USA Landmarks
          </h2>
          <p className="text-muted mt-3 text-sm leading-relaxed">
            Inspired by the breadth of the United States — from coast to canyon, from neon strip to
            quiet prairie — our team works from a country as varied as the tools we build. Here are
            a few landmarks that capture the spirit of the work.
          </p>
        </div>
        <LandmarksCollage variant="collage" />
      </section>

      {/* Team */}
      <section className="mt-14">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">Our team</h2>
          <p className="text-muted mt-3 text-sm leading-relaxed">
            We are a compact, cross-functional team committed to building dependable tools. Each of
            us is paired with a landmark that reflects how we think about scale, craft, and
            resilience.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m) => (
            <li
              key={m.name}
              className="border-border/60 shadow-soft flex h-full gap-4 rounded-2xl border bg-white p-4"
            >
              {/* Local SVG in /public — next/image not needed. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/landmarks/${m.landmark.file}`}
                alt={`${m.landmark.name} — ${m.landmark.location}`}
                width={512}
                height={512}
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-semibold">{m.name}</div>
                <div className="text-muted text-sm">{m.role}</div>
                <div className="text-primary mt-1 text-[11px] font-medium">
                  Inspired by {m.landmark.name}
                </div>
                <p className="text-muted mt-1.5 text-sm leading-relaxed">{m.bio}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Get involved — the rewritten section */}
      <section className="mt-16">
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-10">
          <div className="flex items-center gap-2">
            <span className="bg-accent/10 text-accent flex h-8 w-8 items-center justify-center rounded-lg">
              <Coffee className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">Join us</h2>
          </div>
          <p className="text-muted mt-4 max-w-2xl text-base leading-relaxed">
            We&apos;re a small, fully remote team hiring across time zones. We value ownership,
            trust, and deep work. If you like building tools that real people actually use,
            we&apos;d love to hear from you.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {HOW_WE_WORK.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="border-border/60 bg-muted/5 flex h-full gap-3 rounded-xl border p-4"
              >
                <span className="bg-background text-foreground border-border/60 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-foreground text-sm font-semibold">{title}</div>
                  <p className="text-muted mt-1 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-border/60 mt-8 flex flex-col items-start gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted max-w-md text-sm">
              Open roles are listed on our careers page. Don&apos;t see your role? Send a note and
              tell us what you&apos;d build.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/contact">Get in touch</Link>
              </Button>
              <Button asChild>
                <Link href="/suggest">
                  Suggest a tool
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <p className="text-muted mt-10 text-center text-xs">
        © {new Date().getFullYear()} {SITE_CONFIG.name}. Built with care. Deployed on Cloudflare.
      </p>
    </PageShell>
  );
}
