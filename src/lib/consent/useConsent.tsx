"use client";

import * as React from "react";
import { CONSENT_VERSION, type ConsentRegion, type ConsentState } from "./types";
import {
  buildConsent,
  clearConsent,
  hasCurrentConsent,
  isAllowed,
  readConsent,
  subscribeConsent,
  writeConsent,
} from "./store";

/**
 * Cookie consent: React layer.
 *
 * `<ConsentProvider>` is a client component the layout mounts
 * once. It hydrates from localStorage on mount, subscribes to
 * changes (so the banner can hide the moment the user clicks
 * "Accept All"), and exposes the decision via the
 * `useConsent()` hook.
 *
 * The provider also receives a server-detected `region` prop so
 * the banner can default the toggles sensibly per jurisdiction
 * (strict opt-in for GDPR/CCPA).
 */

type ConsentContextValue = {
  /** Current persisted consent, or null if no current answer. */
  state: ConsentState | null;
  /** Region detected server-side. Used for the default toggles. */
  region: ConsentRegion;
  /** Has the user given a current-version consent? */
  decided: boolean;
  /** True only after the provider has read localStorage. Before
   *  hydration completes we render nothing to avoid a flash of the
   *  banner when the user has already consented. */
  ready: boolean;
  /** Convenience: is this category allowed to run? */
  isAllowed: (category: "essential" | "analytics" | "advertising") => boolean;
  /** Accept all categories. */
  acceptAll: () => void;
  /** Decline all non-essential categories. */
  rejectAll: () => void;
  /** Persist a custom selection. */
  save: (selection: { analytics: boolean; advertising: boolean }) => void;
  /** Forget the persisted record (used by the re-prompt flow). */
  reset: () => void;
};

const ConsentContext = React.createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const ctx = React.useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used inside <ConsentProvider>");
  }
  return ctx;
}

export function ConsentProvider({
  region: initialRegion,
  children,
}: {
  region: ConsentRegion;
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<ConsentState | null>(null);
  const [ready, setReady] = React.useState(false);
  // The region prop passed from the layout is locale-derived (cheap,
  // static). The actual user region requires reading cf-ipcountry
  // which the server-side layout can't do without opting every page
  // into dynamic rendering. So we refine the region client-side via
  // a fetch to /api/diag/consent (dev-only in dev; 404 in prod) or
  // a no-op fallback. GDPR/CCPA users see the locale-based default
  // for a brief moment before the fetch resolves — acceptable for
  // the static-rendering win.
  const [region, setRegion] = React.useState<ConsentRegion>(initialRegion);

  // Hydrate from localStorage on mount. We can't do this during
  // render because it would cause SSR/CSR markup mismatch.
  // The setState-in-effect rule is the documented exception for
  // "read from a non-React store on mount" — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readConsent());

    setReady(true);
    const unsub = subscribeConsent((next) => setState(next));
    return unsub;
  }, []);

  // Refine the region from the edge. Fire-and-forget; failures
  // (network error, off-cloudflare proxy, etc.) keep the
  // locale-based default. /api/region is publicly readable and
  // edge-cached for 1 hour.
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/region")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.region) return;
        setRegion(d.region as ConsentRegion);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable callbacks. They read `state` from the closure each call,
  // so the latest decision is always used. We intentionally don't
  // memoize on `state` because we want callers to be able to invoke
  // these without re-rendering.
  const value = React.useMemo<ConsentContextValue>(() => {
    return {
      state,
      region,
      decided: hasCurrentConsent(state),
      ready,
      isAllowed: (category) => isAllowed(state, category),
      acceptAll: () => {
        const next = buildConsent({
          analytics: true,
          advertising: true,
          method: "accept_all",
          region,
        });
        writeConsent(next);
      },
      rejectAll: () => {
        const next = buildConsent({
          analytics: false,
          advertising: false,
          method: "reject_all",
          region,
        });
        writeConsent(next);
      },
      save: (selection) => {
        const next = buildConsent({
          analytics: selection.analytics,
          advertising: selection.advertising,
          method: "custom",
          region,
        });
        writeConsent(next);
      },
      reset: () => {
        clearConsent();
      },
    };
  }, [state, region, ready]);

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

/**
 * `<ConsentGate category="analytics">` — renders its children only
 * when the user has consented to that category. Use to gate
 * analytics scripts, ad-network tags, or any client-side work that
 * should not run without consent.
 *
 * The children are NOT mounted while the gate is closed, so the
 * enclosed effect/script never executes.
 */
export function ConsentGate({
  category,
  fallback = null,
  children,
}: {
  category: "essential" | "analytics" | "advertising";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { isAllowed, ready } = useConsent();
  // While we don't yet know the consent state (before localStorage
  // read on mount), treat as not-allowed so we don't flash
  // analytics content.
  if (!ready) return fallback;
  return isAllowed(category) ? <>{children}</> : <>{fallback}</>;
}

export { CONSENT_VERSION };
