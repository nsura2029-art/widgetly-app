"use client";

/**
 * /admin/sign-in
 *
 * Username + password form. No Clerk components. On success, the
 * server sets the `wly_admin` HttpOnly cookie and we redirect to the
 * original `next=` target (or /admin).
 *
 * Failure modes:
 *   - 401: "Invalid credentials" (deliberately vague; doesn't leak
 *     which of username/password was wrong)
 *   - 429: rate-limited; show countdown using the Retry-After header
 *   - network error: show "Couldn't reach the server, try again"
 *
 * The form auto-focuses the username field on mount and submits on
 * Enter. The submit button disables while the request is in flight.
 */
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function AdminSignInForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [retryAfter, setRetryAfter] = React.useState<number | null>(null);

  const usernameRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Countdown for the rate-limit Retry-After.
  React.useEffect(() => {
    if (retryAfter == null) return;
    const t = setTimeout(() => setRetryAfter((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [retryAfter]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (r.status === 429) {
        const ra = Number(r.headers.get("retry-after") ?? "60");
        setRetryAfter(ra);
        setError("Too many attempts. Please wait before trying again.");
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Sign-in failed");
        return;
      }
      // If must_change_password, force a password rotation first.
      const data = (await r.json().catch(() => ({}))) as {
        user?: { must_change_password?: number };
      };
      if (data.user?.must_change_password === 1) {
        // Preserve `next=` so the user lands where they intended
        // after the forced change.
        const sep = next.includes("?") ? "&" : "?";
        router.replace(`/admin/account/password${sep}first=1&next=${encodeURIComponent(next)}`);
        return;
      }
      router.replace(next);
    } catch (err) {
      setError("Couldn't reach the server. Check your connection and try again.");
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
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Admin sign-in</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Restricted area. Authorized personnel only.
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
              <div className="flex-1">
                <p>{error}</p>
                {retryAfter != null && retryAfter > 0 && (
                  <p className="mt-1 text-xs text-rose-600">Try again in {retryAfter}s</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="username" className="text-foreground mb-1.5 block text-sm font-medium">
              Username
            </label>
            <input
              ref={usernameRef}
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

          <div>
            <label htmlFor="password" className="text-foreground mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="border-border focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:ring-2 focus:outline-none disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || (retryAfter != null && retryAfter > 0)}
            className="bg-brand-gradient text-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <Link
              href="/admin/forgot-password"
              className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              ← Back to widgetly.tech
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminSignInPage() {
  // useSearchParams suspends during static prerender, so wrap the
  // form in a Suspense boundary to satisfy Next.js 16's static
  // generation rules.
  return (
    <React.Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-[calc(100dvh-3.5rem)] items-center justify-center text-sm">
          Loading…
        </div>
      }
    >
      <AdminSignInForm />
    </React.Suspense>
  );
}
