"use client";

/**
 * Change-password form. Client component — needs useRouter + state.
 *
 * On first-time (must_change_password=1), the parent page-level check
 * would have redirected to here already. The shell passes the user
 * via the /api/admin/auth/me probe (no extra wiring needed). After
 * success we send the user back to where they were going (next=) or
 * the dashboard root.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

type Mode = "forced" | "voluntary";

export function ChangePasswordForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";
  const mode: Mode = sp.get("first") === "1" ? "forced" : "voluntary";

  const [current, setCurrent] = React.useState("");
  const [next1, setNext1] = React.useState("");
  const [next2, setNext2] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next1 !== next2) {
      setError("New passwords do not match");
      return;
    }
    if (next1.length < 10) {
      setError("New password must be at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
      const csrfRes = await fetch("/api/admin/csrf-token", { credentials: "same-origin" });
      const { token } = (await csrfRes.json().catch(() => ({}))) as { token?: string };
      const r = await fetch("/api/admin/account/password", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        body: JSON.stringify({
          current_password: current,
          new_password: next1,
          confirm_password: next2,
        }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not change password");
        return;
      }
      setSuccess(true);
      // Brief pause so the user sees the success state.
      setTimeout(() => router.replace(next), 800);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <KeyRound className="text-primary h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {mode === "forced" ? "Set a new password" : "Change password"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === "forced"
              ? "You must choose a new password before continuing."
              : "Update the password used to sign in to the admin dashboard."}
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
              <span>Password updated. Redirecting…</span>
            </div>
          )}

          <div>
            <label
              htmlFor="current_password"
              className="text-foreground mb-1.5 block text-sm font-medium"
            >
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={submitting || success}
              className="border-border focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            />
          </div>

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
              value={next1}
              onChange={(e) => setNext1(e.target.value)}
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
              value={next2}
              onChange={(e) => setNext2(e.target.value)}
              disabled={submitting || success}
              className="border-border focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || success}
            className="bg-brand-gradient text-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Updating…
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Done
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {mode === "forced" ? "Set password & continue" : "Update password"}
              </>
            )}
          </button>

          {mode === "voluntary" && (
            <p className="text-muted-foreground pt-1 text-center text-xs">
              <Link
                href="/admin"
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                ← Back to dashboard
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
