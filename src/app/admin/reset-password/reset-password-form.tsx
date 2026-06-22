"use client";

/**
 * Reset-password form. Reads `?token=` from the URL, sends it with the
 * new password to /api/admin/account/reset-password, then signs the
 * user in (using the same CSRF flow as login — see below) before
 * redirecting to /admin.
 *
 * The sign-in after reset is convenient but a small UX nicety: after
 * resetting, the user is signed in so they don't have to type the
 * new password twice. If the API can't issue a session cookie, fall
 * back to /admin/sign-in.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

export function ResetPasswordForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing reset token in the URL. Use the link from the forgot-password page.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/account/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, new_password: password, confirm_password: confirm }),
      });
      if (r.status === 410) {
        setError("This reset link has expired or already been used.");
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not reset password");
        return;
      }
      setSuccess(true);
      // Reset is done — bounce to sign-in so the user authenticates
      // with their new password (we don't auto-sign-in here since
      // we'd need their username, which the page doesn't have).
      setTimeout(() => router.replace("/admin/sign-in"), 800);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <ShieldCheck className="text-primary h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Choose a new password
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set a strong password to finish resetting your admin account.
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
          {success && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Password reset. Redirecting to sign-in…</span>
            </div>
          )}

          <div>
            <label
              htmlFor="new_password"
              className="text-foreground mb-1.5 block text-sm font-medium"
            >
              New password
            </label>
            <input
              id="new_password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || success}
              className="border-border focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            />
            <p className="text-muted-foreground mt-1 text-xs">Minimum 10 characters.</p>
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="text-foreground mb-1.5 block text-sm font-medium"
            >
              Confirm new password
            </label>
            <input
              id="confirm_password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting || success}
              className="border-border focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || success || !token}
            className="bg-brand-gradient text-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Resetting…
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Done
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Set new password
              </>
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
