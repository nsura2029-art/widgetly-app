"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Linkedin, Send, Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_URGENCIES,
  type SuggestionCategory,
  type SuggestionUrgency,
} from "@/lib/d1/suggestions";
import { validateSuggestionForm, type SuggestionFormInput } from "@/lib/suggestions/validation";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof SuggestionFormInput, string>>;

const limits = {
  toolName: { min: 3, max: 50 },
  description: { min: 50, max: 500 },
  useCase: { min: 20, max: 300 },
};

const initialForm: SuggestionFormInput = {
  toolName: "",
  description: "",
  useCase: "",
  // Empty string forces the user to make a real choice in the
  // category dropdown. The Zod schema rejects empty values with
  // "Please choose a category." The placeholder option below
  // makes the empty value visible to the user instead of silently
  // picking a default (which used to be "AI", a category that
  // doesn't fit most suggestions).
  category: "" as SuggestionCategory,
  urgency: "medium",
  email: "",
};

function counter(value: string, max: number) {
  return `${value.length}/${max}`;
}

export function SuggestionForm() {
  const [form, setForm] = useState<SuggestionFormInput>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => validateSuggestionForm(form), [form]);

  function update<K extends keyof SuggestionFormInput>(key: K, value: SuggestionFormInput[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    const parsed = validateSuggestionForm(next);
    if (parsed.success) {
      setErrors({});
      return;
    }
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof SuggestionFormInput | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    setErrors(fieldErrors);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = validateSuggestionForm(form);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SuggestionFormInput | undefined;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setServerError("");
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        setServerError(body?.error?.message ?? "Could not submit this suggestion.");
        return;
      }
      const slug = body.suggestion.slug as string;
      setShareUrl(`${window.location.origin}/suggest/${slug}`);
    } catch {
      setServerError("We could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (shareUrl) {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(
      `Vote for my Widgetly tool suggestion: ${form.toolName}`
    );
    return (
      <div className="border-border/60 shadow-soft mt-8 rounded-2xl border bg-white/80 p-6 text-center backdrop-blur sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <Check className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-foreground mt-4 text-2xl font-semibold">Suggestion received</h2>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Your idea is on the board. Share the link so others can upvote it.
        </p>
        <div className="border-border bg-muted/5 mt-5 overflow-hidden rounded-xl border p-3 text-left text-sm break-all">
          {shareUrl}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={copy}>
            <Clipboard className="h-4 w-4" />
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <Share2 className="h-4 w-4" />X
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`}
              target="_blank"
              rel="noreferrer"
            >
              Reddit
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/suggest/${shareUrl.split("/").pop()}`}>View suggestion</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border-border/60 shadow-soft mt-8 space-y-5 rounded-2xl border bg-white/80 p-5 backdrop-blur sm:p-7"
    >
      <Field
        label="Tool Name"
        error={errors.toolName}
        counter={counter(form.toolName, limits.toolName.max)}
      >
        <Input
          value={form.toolName}
          onChange={(event) => update("toolName", event.target.value.slice(0, limits.toolName.max))}
          placeholder="PDF Summarizer"
          invalid={Boolean(errors.toolName)}
          required
        />
      </Field>

      <Field
        label="Description"
        error={errors.description}
        counter={counter(form.description, limits.description.max)}
      >
        <textarea
          value={form.description}
          onChange={(event) =>
            update("description", event.target.value.slice(0, limits.description.max))
          }
          rows={5}
          placeholder="Describe what the tool should do and why people would use it."
          className={textareaClass(Boolean(errors.description))}
          required
        />
      </Field>

      <Field
        label="Use Case"
        error={errors.useCase}
        counter={counter(form.useCase, limits.useCase.max)}
      >
        <textarea
          value={form.useCase}
          onChange={(event) => update("useCase", event.target.value.slice(0, limits.useCase.max))}
          rows={4}
          placeholder="Who needs this, and what job are they trying to finish?"
          className={textareaClass(Boolean(errors.useCase))}
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" error={errors.category}>
          <select
            value={form.category}
            onChange={(event) => update("category", event.target.value as SuggestionCategory)}
            className="border-border h-12 w-full rounded-xl border bg-white px-4 text-sm"
            required
          >
            <option value="" disabled>
              Select a category…
            </option>
            {SUGGESTION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Urgency" error={errors.urgency}>
          <select
            value={form.urgency}
            onChange={(event) => update("urgency", event.target.value as SuggestionUrgency)}
            className="border-border h-12 w-full rounded-xl border bg-white px-4 text-sm capitalize"
          >
            {SUGGESTION_URGENCIES.map((urgency) => (
              <option key={urgency} value={urgency}>
                {urgency}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Email" error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          autoComplete="email"
          required
        />
      </Field>

      {serverError && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-xs">Limit: 3 suggestions per email per day.</p>
        <Button type="submit" size="lg" disabled={submitting || !validation.success}>
          {submitting ? "Submitting..." : "Submit suggestion"}
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  counter,
  children,
}: {
  label: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-medium">
        <span>{label}</span>
        {counter && <span className="text-muted text-xs font-normal tabular-nums">{counter}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function textareaClass(invalid: boolean) {
  return cn(
    "border-border shadow-soft flex w-full rounded-xl border bg-white px-4 py-3 text-sm",
    "placeholder:text-muted/70 resize-y transition-all duration-200",
    "focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
    invalid && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/40"
  );
}
