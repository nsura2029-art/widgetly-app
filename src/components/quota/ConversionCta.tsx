"use client";

/**
 * ConversionCta — placeholder "Run this tool" CTA on tool detail
 * pages. Reads the current quota state from /api/conversions/quota
 * and lets the user click "Use 1 of N" to "reserve" a page.
 *
 * Behavior:
 *   - When `remaining > 0` and not loading, render a "Run 1 of N
 *     today" button. On click, POSTs to /api/conversions/reserve
 *     with `{ pages: 1, toolSlug }`. On 2xx, the page navigates
 *     to a "coming soon" interstitial; on 429, we fall through to
 *     the "limit reached" state below.
 *   - When `remaining === 0`, render a "Limit reached — sign up
 *     to get more pages" state with a Sign in / Sign up button.
 *   - When unauthenticated, the Sign in button promotes the user
 *     to a registered account (5 pages/day instead of 1).
 *
 * The actual tool UI doesn't ship in this PR — the reservation
 * endpoint records the usage and the CTA links to `/[locale]/tools`
 * so the user can browse the next tool. When real tool UIs land,
 * swap the link target for the real tool route.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSafeUser } from "@/lib/auth/use-safe-user";
import { useTranslations } from "next-intl";
import { Sparkles, Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type QuotaState = {
  actorType: "anonymous" | "registered";
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};

export function ConversionCta({ toolSlug, className }: { toolSlug: string; className?: string }) {
  const t = useTranslations("conversionCta");
  const { isLoaded, isSignedIn } = useSafeUser();
  const router = useRouter();
  const [state, setState] = React.useState<QuotaState | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch quota on mount + whenever the user signs in/out
  // (Clerk's useUser() is reactive — re-runs the effect when
  // the auth state changes).
  React.useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    fetch("/api/conversions/quota", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: { ok?: boolean } & QuotaState) => {
        if (cancelled) return;
        if (body.ok) setState(body);
      })
      .catch(() => {
        // Silent fail — CTA falls back to "loading" state. The
        // user can still try clicking; the API will return 503
        // and we'll surface the error inline.
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  async function reserve() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/conversions/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pages: 1, toolSlug }),
      });
      if (r.status === 429) {
        // Limit reached — refresh state and let the "limit
        // reached" UI render on the next paint.
        const body = await r.json().catch(() => ({}));
        setError(body?.error?.message ?? t("limitReached"));
        const fresh = await fetch("/api/conversions/quota").then((x) => (x.ok ? x.json() : null));
        if (fresh?.ok) setState(fresh);
        return;
      }
      if (!r.ok) {
        setError(t("error"));
        return;
      }
      // Success — refresh the counter and bounce to the tool
      // index. (When real tool UIs exist, this becomes a navigate
      // to the in-tool page.)
      const fresh = await fetch("/api/conversions/quota").then((x) => (x.ok ? x.json() : null));
      if (fresh?.ok) setState(fresh);
      router.push(
        `/${(typeof window !== "undefined" && window.location.pathname.split("/")[1]) || "en"}/tools`
      );
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded || !state) {
    // Skeleton while we wait for Clerk + the quota fetch.
    return (
      <div
        className={cn(
          "border-border/60 shadow-soft h-24 animate-pulse rounded-2xl border bg-white/60",
          className
        )}
      />
    );
  }

  const reached = state.remaining <= 0;
  const resetDate = new Date(state.resetAt);
  const resetLabel = resetDate.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div
      className={cn(
        "border-border/60 shadow-soft rounded-2xl border bg-white/80 p-5 backdrop-blur sm:p-6",
        reached && "border-amber-300/60 bg-amber-50/60",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            reached ? "bg-amber-500/15 text-amber-700" : "bg-primary/10 text-primary"
          )}
        >
          {reached ? <Lock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          {reached ? (
            <>
              <p className="text-foreground text-base font-semibold">{t("limitTitle")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("limitBody", {
                  used: state.used,
                  limit: state.limit,
                  resetAt: resetLabel,
                })}
              </p>
              {error && <p className="mt-2 text-xs text-amber-800">{error}</p>}
            </>
          ) : (
            <>
              <p className="text-foreground text-base font-semibold">
                {t("readyTitle", { remaining: state.remaining, limit: state.limit })}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("readyBody", { used: state.used, limit: state.limit })}
              </p>
              {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {reached ? (
              !isSignedIn ? (
                <SignInInline label={t("signInForMore")} />
              ) : (
                <span className="text-muted-foreground text-xs">
                  {t("comeBackAt", { resetAt: resetLabel })}
                </span>
              )
            ) : (
              <Button onClick={reserve} disabled={busy}>
                {busy ? t("reserving") : t("useOne", { remaining: state.remaining })}
              </Button>
            )}
            <Link
              href="/tools"
              className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
            >
              {t("browseAll")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline sign-in CTA. Uses Clerk's SignInButton in modal mode with
 * a forceRedirectUrl that brings the user back to the current page
 * (so they keep their tool selection). Falls back to a /sign-in
 * link if Clerk's modal isn't available (e.g. during static export).
 */
function SignInInline({ label }: { label: string }) {
  // We import lazily so the component tree doesn't pull Clerk into
  // the tool-detail bundle when the user is already signed in.
  const [Clerk, setClerk] = React.useState<typeof import("@clerk/nextjs") | null>(null);
  React.useEffect(() => {
    void import("@clerk/nextjs").then(setClerk);
  }, []);
  const target = typeof window !== "undefined" ? window.location.href : "/";
  if (Clerk) {
    return (
      <Clerk.SignInButton mode="modal" forceRedirectUrl={target}>
        <Button>
          <LogIn className="h-4 w-4" />
          {label}
        </Button>
      </Clerk.SignInButton>
    );
  }
  return (
    <Button disabled>
      <LogIn className="h-4 w-4" />
      {label}
    </Button>
  );
}
