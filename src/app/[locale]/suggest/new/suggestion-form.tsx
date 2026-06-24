"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Linkedin, LogIn, Mail, Send, Share2 } from "lucide-react";
import { useSafeUser } from "@/lib/auth/use-safe-user";
import { ClerkSignInButton, ClerkSignUpButton } from "@/components/auth/clerk-auth-buttons";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_URGENCIES,
  type SuggestionCategory,
  type SuggestionUrgency,
} from "@/lib/d1/suggestions";
import {
  SUGGESTION_ERROR_CODES,
  validateSuggestionForm,
  type SuggestionFormInput,
} from "@/lib/suggestions/validation";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<keyof SuggestionFormInput, string>>;

const limits = {
  toolName: { min: 3, max: 50 },
  description: { min: 50, max: 500 },
  useCase: { min: 20, max: 300 },
};

const initialForm: Omit<SuggestionFormInput, "email"> = {
  toolName: "",
  description: "",
  useCase: "",
  // Empty string forces the user to make a real choice in the
  // category dropdown. The Zod schema rejects empty values with
  // the `categoryRequired` error code. The placeholder option below
  // makes the empty value visible to the user instead of silently
  // picking a default (which used to be "AI", a category that
  // doesn't fit most suggestions).
  category: "" as SuggestionCategory,
  urgency: "medium",
  // Email is sourced from Clerk (verified primary) — see
  // `submit()` and the "Posting as" line under the form.
  // We don't collect it from the user anymore.
};

function counter(value: string, max: number) {
  return `${value.length}/${max}`;
}

/**
 * Map a Zod error code (a stable, locale-independent identifier) to a
 * localized message key under `suggest.formNew.errors`. The form's
 * `useTranslations("suggest.formNew.errors")` call then resolves the
 * human-readable string for the active locale.
 *
 * If the validation layer ever returns an unknown code we fall back to
 * the raw code so debugging stays tractable (better than swallowing
 * the error).
 */
function translateError(code: string, tErrors: (key: string) => string) {
  const known = Object.values(SUGGESTION_ERROR_CODES) as string[];
  if (known.includes(code)) {
    return tErrors(code);
  }
  return code;
}

/**
 * Auth-aware wrapper. Signed-out visitors see a "Sign in to submit"
 * panel with a sign-in / sign-up button. The button uses
 * `forceRedirectUrl` so Clerk bounces the user back to this page
 * after auth — their in-progress form fields are still in
 * component state, but the form is freshly mounted on each load,
 * so they'll need to re-fill. We accept that as a tradeoff for
 * the security benefit of knowing who submitted what.
 *
 * Signed-in visitors see the actual <SuggestionFormInner />.
 */
export function SuggestionForm() {
  const { isLoaded, isSignedIn } = useSafeUser();
  if (!isLoaded) {
    // Skeleton while Clerk resolves — prevents a flash where the
    // form briefly shows before the user is known.
    return (
      <div className="border-border/60 shadow-soft mt-8 h-64 animate-pulse rounded-2xl border bg-white/80 backdrop-blur" />
    );
  }
  if (!isSignedIn) return <SignInRequiredPanel />;
  return <SuggestionFormInner />;
}

function SignInRequiredPanel() {
  const t = useTranslations("suggest.formNew");
  return (
    <div className="border-border/60 shadow-soft mt-8 rounded-2xl border bg-white/80 p-6 text-center backdrop-blur sm:p-8">
      <div className="text-muted-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
        <LogIn className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="text-foreground mt-4 text-2xl font-semibold">{t("signInTitle")}</h2>
      <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">{t("signInBody")}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ClerkSignInButton label={t("signInAction")} variant="default" size="lg" />
        <ClerkSignUpButton label={t("signUpAction")} variant="outline" size="lg" />
      </div>
    </div>
  );
}

function SuggestionFormInner() {
  const t = useTranslations("suggest.formNew");
  const tErrors = useTranslations("suggest.formNew.errors");
  // `locale` is the active route segment (e.g. "en", "es", "fr"). We
  // use it to build share URLs that include the locale prefix, so the
  // suggestion page is reachable from social posts, the copy button,
  // and the view-suggestion link. Without this, social previews and
  // bookmarks land on /suggest/<slug> which 404s (the real route is
  // /<locale>/suggest/<slug>).
  const locale = useLocale();
  const { user } = useSafeUser();
  // Pull the verified primary email once and use it both for the
  // "Posting as" line and for the API request payload. We prefer
  // `primaryEmailAddress` (Clerk's verified-primary) but fall back
  // to the first email address on the user.
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;
  const [form, setForm] = useState<Omit<SuggestionFormInput, "email">>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => validateSuggestionForm(form), [form]);

  function update<K extends keyof Omit<SuggestionFormInput, "email">>(
    key: K,
    value: Omit<SuggestionFormInput, "email">[K]
  ) {
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
      if (field && !fieldErrors[field]) fieldErrors[field] = translateError(issue.message, tErrors);
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
        if (field && !fieldErrors[field])
          fieldErrors[field] = translateError(issue.message, tErrors);
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setServerError("");
    try {
      // We always send the Clerk-verified primary email as the
      // submission's contact. The server route also enforces this
      // (overriding anything the client sends) — this is just so the
      // API request body is well-formed and matches the schema.
      const payload = {
        ...parsed.data,
        email:
          user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? "",
      };
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        setServerError(body?.error?.message ?? t("serverErrorFallback"));
        return;
      }
      const slug = body.suggestion.slug as string;
      setShareUrl(`${window.location.origin}/${locale}/suggest/${slug}`);
    } catch {
      setServerError(t("networkError"));
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
    const encodedText = encodeURIComponent(t("shareTweetText", { toolName: form.toolName }));
    return (
      <div className="border-border/60 shadow-soft mt-8 rounded-2xl border bg-white/80 p-6 text-center backdrop-blur sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <Check className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-foreground mt-4 text-2xl font-semibold">{t("successTitle")}</h2>
        <p className="text-muted mt-2 text-sm leading-relaxed">{t("successBody")}</p>
        <div className="border-border bg-muted/5 mt-5 overflow-hidden rounded-xl border p-3 text-left text-sm break-all">
          {shareUrl}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={copy}>
            <Clipboard className="h-4 w-4" />
            {copied ? t("copied") : t("copyLink")}
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <Share2 className="h-4 w-4" />
              {t("shareOnX")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin className="h-4 w-4" />
              {t("shareOnLinkedIn")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("shareOnReddit")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/suggest/${shareUrl.split("/").pop()}`}>{t("viewSuggestion")}</Link>
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
        label={t("toolNameLabel")}
        error={errors.toolName}
        counter={counter(form.toolName, limits.toolName.max)}
      >
        <Input
          value={form.toolName}
          onChange={(event) => update("toolName", event.target.value.slice(0, limits.toolName.max))}
          placeholder={t("toolNamePlaceholder")}
          invalid={Boolean(errors.toolName)}
          required
        />
      </Field>

      <Field
        label={t("descriptionLabel")}
        error={errors.description}
        counter={counter(form.description, limits.description.max)}
      >
        <textarea
          value={form.description}
          onChange={(event) =>
            update("description", event.target.value.slice(0, limits.description.max))
          }
          rows={5}
          placeholder={t("descriptionPlaceholder")}
          className={textareaClass(Boolean(errors.description))}
          required
        />
      </Field>

      <Field
        label={t("useCaseLabel")}
        error={errors.useCase}
        counter={counter(form.useCase, limits.useCase.max)}
      >
        <textarea
          value={form.useCase}
          onChange={(event) => update("useCase", event.target.value.slice(0, limits.useCase.max))}
          rows={4}
          placeholder={t("useCasePlaceholder")}
          className={textareaClass(Boolean(errors.useCase))}
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("categoryLabel")} error={errors.category}>
          <select
            value={form.category}
            onChange={(event) => update("category", event.target.value as SuggestionCategory)}
            className="border-border h-12 w-full rounded-xl border bg-white px-4 text-sm"
            required
          >
            <option value="" disabled>
              {t("categoryPlaceholder")}
            </option>
            {SUGGESTION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("urgencyLabel")} error={errors.urgency}>
          <select
            value={form.urgency}
            onChange={(event) => update("urgency", event.target.value as SuggestionUrgency)}
            className="border-border h-12 w-full rounded-xl border bg-white px-4 text-sm capitalize"
          >
            {SUGGESTION_URGENCIES.map((urgency) => (
              <option key={urgency} value={urgency}>
                {t(`urgency${urgency.charAt(0).toUpperCase()}${urgency.slice(1)}` as const)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/*
        No email field here — for signed-in users the verified
        primary email comes from Clerk and is attached automatically
        (see submit() above). We surface a small "Posting as" line
        so the user has a clear visual confirmation of which email
        will receive status updates. The value lives in the same
        Clerk session that authed the request, so it can't be spoofed.
      */}
      {userEmail && (
        <div className="border-border/60 bg-muted/10 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm">
          <Mail aria-hidden="true" className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="text-muted-foreground">
            {t("emailFromAccountPrefix", { email: userEmail })}
          </span>
        </div>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-xs">{t("rateLimit")}</p>
        <Button type="submit" size="lg" disabled={submitting || !validation.success}>
          {submitting ? t("submitting") : t("submit")}
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
  void counter;
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
