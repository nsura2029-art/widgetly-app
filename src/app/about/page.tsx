import React from "react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/constants";
import { LandmarksCollage, LANDMARKS } from "@/components/about/landmarks-collage";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "About Us | Widgetly",
  description: "Simple, secure, and reliable tools to help you work better and faster.",
};

// Build team cards directly from the landmarks roster so the imagery on the
// page stays in sync with the collage above (one landmark per team member).
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

export default function AboutPage() {
  return (
    <PageShell width="default">
      <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">About Widgetly</h1>
        <p className="text-muted mt-3 text-lg">
          Simple, secure, and reliable tools to help you work better and faster. We focus on
          removing friction so you can focus on what matters most.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Our Ethos</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>• Simple: Tools that just work, without noise.</li>
              <li>• Secure: Privacy-first defaults and careful data handling.</li>
              <li>• Reliable: Fast, resilient performance at scale.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Mission</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>• Help people work better and faster.</li>
              <li>• Reduce repetitive tasks through smart automation.</li>
              <li>• Make powerful tools accessible to everyone.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Iconic USA Landmarks</h2>
          <p className="text-muted mt-2 max-w-prose text-sm">
            Inspired by the breadth of the United States — from coast to canyon, from neon strip to
            quiet prairie — our team works from a country as varied as the tools we build. Here are
            a few landmarks that capture the spirit of the work.
          </p>
          <LandmarksCollage variant="collage" />
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold">Our Team</h2>
          <p className="text-muted mt-2 max-w-prose text-sm">
            We are a compact, cross-functional team committed to building dependable tools. Each of
            us is paired with a landmark that reflects how we think about scale, craft, and
            resilience.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m) => (
              <div key={m.name} className="bg-muted/5 flex gap-4 rounded-md p-4">
                {/* Local SVG in /public — next/image not needed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/landmarks/${m.landmark.file}`}
                  alt={`${m.landmark.name} — ${m.landmark.location}`}
                  className="h-20 w-20 rounded-md object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-muted text-sm">{m.role}</div>
                  <div className="text-primary mt-1 text-[11px] font-medium">
                    Inspired by {m.landmark.name}
                  </div>
                  <div className="text-muted mt-1 text-sm">{m.bio}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-border/60 mt-10 border-t pt-8">
          <h2 className="text-xl font-semibold">Get involved</h2>
          <p className="text-muted mt-2 max-w-prose text-sm">
            We hire remote-first talent inspired by Zurich and Belgrade-style culture — distributed
            teams who value ownership, trust, and async collaboration. Interested in joining?
            We&apos;d love to hear from you.
          </p>

          <div className="mt-4 flex gap-3">
            <Link href="/suggest" className="border-border rounded-md border px-4 py-2 text-sm">
              Suggest a Tool
            </Link>
            <Link
              href="/#categories"
              className="bg-brand-gradient rounded-md px-4 py-2 text-sm text-white"
            >
              See All PDF Tools
            </Link>
          </div>
        </div>

        <div className="text-muted mt-8 text-sm">
          © {new Date().getFullYear()} {SITE_CONFIG.name}
        </div>
      </div>
    </PageShell>
  );
}
