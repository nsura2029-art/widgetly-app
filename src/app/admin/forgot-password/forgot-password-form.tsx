"use client";

/**
 * Forgot-password form. Username entry; on submit, calls the API and
 * displays the reset URL. Until email is wired up, this is the only
 * way to complete the reset flow — the requester copies the link.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetUrl, setResetUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetUrl(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/account/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (r.status === 429) {
        setError("Too many reset attempts. Try again in a few minutes.");
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not start the reset");
        return;
      }
      const data = (await r.json()) as { reset_url: string | null; expires_in_minutes: number };
      setResetUrl(data.reset_url);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copy() {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore — user can copy manually */
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <KeyRound className="text-primary h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Forgot password</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your admin username and we'll generate a one-time reset link.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-border bg-card shadow-soft space-y-4 rounded-2xl border p-6"
        >
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {resetUrl && (
            <div
              role="status"
              className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  If <code className="rounded bg-emerald-100/60 px-1">{username}</code> exists, a
                  reset link is ready. It expires in 60 minutes.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={resetUrl}
                  className="border-border text-foreground h-9 w-full rounded-md border bg-white px-2 text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={copy}
                  className="border-border bg-card hover:bg-muted inline-flex h-9 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-medium"
                  aria-label="Copy reset link"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => router.push(resetUrl)}
                className="bg-brand-gradient text-foreground inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold"
              >
                Open reset link →
              </button>
            </div>
          )}

          <div>
            <label htmlFor="username" className="text-foreground mb-1.5 block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              className="border-border focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-gradient text-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : (
              "Generate reset link"
            )}
          </button>

          <p className="text-muted-foreground pt-1 text-center text-xs">
            <Link
              href="/admin/sign-in"
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              ← Back to sign-in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
