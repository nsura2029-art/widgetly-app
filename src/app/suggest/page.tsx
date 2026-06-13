"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export default function SuggestPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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
      <PageShell width="narrow">
        <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-8 text-center sm:p-10">
          <h1 className="text-2xl font-semibold">Got it!</h1>
          <p className="text-muted mt-4">We'll build it if enough users request it.</p>
          <div className="mt-6 flex justify-center">
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Suggest a Tool</h1>
        <p className="text-muted mt-2 text-sm">Let us know what you'd like to see added.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tool name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border/70 w-full rounded-md border px-3 py-2"
              placeholder="e.g. PDF Summarizer"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-border/70 w-full rounded-md border px-3 py-2"
              rows={4}
              placeholder="Briefly describe what the tool does and why it's useful"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category (optional)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-border/70 w-full rounded-md border px-3 py-2"
              placeholder="e.g. Productivity, AI, Education"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-border/70 w-full rounded-md border px-3 py-2"
              placeholder="your@email.com"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex items-center gap-3">
            <Button type="submit">Submit suggestion</Button>
            <Link href="/">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
