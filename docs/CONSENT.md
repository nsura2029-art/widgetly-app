# Cookie Consent & Tracking

> Architecture, state machine, and the answer to **"are we tracking
> users?"** for the Widgetly app.

This doc covers everything that lives under `src/lib/consent/` and
`src/components/consent/`. If you want to **add analytics**, **add a
new cookie category**, or **debug a banner that's not showing**,
start here.

For the legal text that surfaces to users, see:

- `src/content/legal/cookies-policy.tsx`
- `src/content/legal/privacy-policy.tsx`
- `src/content/legal/terms-and-conditions.tsx`

---

## TL;DR

- **We track zero user behavior today.** The consent store only
  stores the user's cookie preferences in `localStorage`. No
  pageviews, no clicks, no tool usage, no third-party analytics.
- The banner appears on the user's first visit, asks them to choose,
  and remembers the choice on the same device forever (or until
  they hit "Reset choices" in the footer).
- The dev-only diagnostic lives at `/api/diag/consent` (404 in
  production).
- Region detection is done server-side from Cloudflare's
  `cf-ipcountry` header, with a locale-based fallback.

---

## State machine

The user can be in exactly one of three states at any moment:

| State         | `wly_consent` in `localStorage` | Banner visible? | Modal opens with    |
| ------------- | ------------------------------- | --------------- | ------------------- |
| `ready=false` | (not yet read)                  | hidden          | (nothing — no UI)   |
| `decided`     | valid record, version matches   | hidden          | current toggles     |
| `pending`     | null / stale version            | **shown**       | defaults (both off) |

`ready` flips from `false` → `true` inside `useEffect` on first
mount, after the `localStorage` read returns. Before that flip the
banner is not rendered, which avoids an SSR-hydration mismatch
(server can't see `localStorage`).

### What each button does

```
                   ┌──────────────────────┐
                   │  User opens the site │
                   └──────────┬───────────┘
                              │ ready=true, state=null
                              ▼
                   ┌──────────────────────┐
                   │  Banner appears      │
                   └──────────┬───────────┘
            ┌─────────────────┼─────────────────┐
            │                 │                 │
   [Accept all]       [Reject all]       [Customize]
            │                 │                 │
            ▼                 ▼                 ▼
    essential: true   essential: true   (banner hides,
    analytics: true   analytics: false    modal opens)
    advertising: true advertising: false
    method:           method:
      accept_all        reject_all
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                   localStorage.setItem(
                     "wly_consent", JSON
                     .stringify(state))
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Banner hides        │
                   │  (<ConsentBanner>    │
                   │  returns null)       │
                   └──────────────────────┘
```

Inside the modal:

- `Essential` switch is **always on, disabled** (per GDPR — the
  switch literally cannot be turned off because the site won't
  function without it).
- `Analytics` and `Advertising` switches are independent. The
  user's last stored state pre-fills them.
- Two footer buttons: **Save preferences** (writes with
  `method: "custom"`) and **Accept all** (writes with
  `method: "accept_all"`).
- There is no "Reject all" inside the modal — that's the banner
  button. If the user wants to wipe choices entirely, the footer
  has a separate "Reset choices" link that clears
  `localStorage["wly_consent"]` and lets the banner re-appear.

### What the stored record looks like

```json
{
  "essential": true,
  "analytics": true,
  "advertising": false,
  "consentVersion": "1.0",
  "timestamp": "2026-06-15T13:59:54.565Z",
  "method": "custom",
  "region": "gdpr"
}
```

- `essential` is always `true` (schema-shaped; the switch is
  always on).
- `consentVersion` is the version of the consent schema the user
  agreed to. The store compares it against `CONSENT_VERSION` from
  `src/lib/consent/types.ts`. **Bump that constant whenever the
  categories, defaults, or semantics change in a way that would
  invalidate a prior choice** — mismatch forces a re-prompt.
- `timestamp` is ISO-8601, generated when the user clicks the
  button (not when the banner appears).
- `method` is one of `"accept_all"`, `"reject_all"`, `"custom"`,
  `"default"`. `"default"` is the placeholder used by
  `DEFAULT_CONSENT`; you'll never see it in a stored record.
- `region` is the jurisdiction at the moment of consent, used for
  audit and debugging.

---

## Region detection

Two-tier. Country code wins, locale is the fallback.

```ts
// src/lib/consent/region.ts
regionFromCountry("DE"); // -> "gdpr"   (EU-27 + EEA-3 + UK)
regionFromCountry("US"); // -> "other"  (not a CCPA state)
regionFromCountry("CA"); // -> "ccpa"
regionFromCountry(null); // -> "other"  (no header)

regionFromLocale("fr-FR,fr;q=0.9"); // -> "gdpr"
regionFromLocale("es-MX,es;q=0.9"); // -> "other"  (LATAM, not Spain)
regionFromLocale("en-US,en;q=0.9"); // -> "other"
```

The production layout (`src/app/[locale]/layout.tsx`) does
`region = fromCountry !== "other" ? fromCountry : fromLocale` and
passes the result into `<ConsentProvider>`. That means:

- A German user with a Spanish browser language → still `gdpr`
  (country wins).
- A Mexican user with a Spanish browser language → `other`
  (country falls through, locale excluded because LATAM is not
  protected under GDPR).

The GDPR set is EU-27 + Iceland / Liechtenstein / Norway + UK.
The CCPA set is California + Virginia + Colorado + Connecticut +
Utah + Texas + 9 other US states with similar opt-out regimes.
Update those sets in `src/lib/consent/region.ts` when new laws
go into effect.

> **This signal is not always correct.** VPNs, mobile carriers,
> satellite providers, IPv6 gaps, and aggressive NAT can all
> produce the wrong country code. The **Customize** button in the
> banner lets the user override the defaults, which is the
> correct way to handle a wrong default.

---

## How to use `<ConsentGate>`

Wrap any client component that should only run when consent is
granted:

```tsx
"use client";

import Script from "next/script";
import { ConsentGate } from "@/lib/consent/useConsent";

export function AnalyticsLoader() {
  return (
    <ConsentGate category="analytics" fallback={null}>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        strategy="afterInteractive"
        onLoad={() => {
          // gtag bootstrap
          window.dataLayer = window.dataLayer || [];
          function gtag() {
            window.dataLayer.push(arguments);
          }
          gtag("js", new Date());
          gtag("config", process.env.NEXT_PUBLIC_GA_ID!);
        }}
      />
    </ConsentGate>
  );
}
```

What `ConsentGate` does:

- `ready === false` (pre-hydration) → returns `fallback`. This
  prevents a tracker from loading for one frame, then
  unmounting if the user rejects.
- `ready === true && isAllowed(category)` → renders `children`.
- `ready === true && !isAllowed(category)` → returns `fallback`
  and **unmounts the children** (so any loaded tracker stops
  receiving events and any DOM elements are removed).

Children are unmounted, not just hidden. A `<Script>` that
already loaded stays in the DOM but won't get new events
because the surrounding component tree is gone.

> Don't put server-rendered content inside a `ConsentGate` —
> you'll get a flash. Use it for client components, scripts,
> analytics calls, ad tags, etc.

---

## What we **do not** track

- **Pageviews, sessions, referrers.** No `gtag`, no `posthog`,
  no `plausible`, no Cloudflare Web Analytics beacon on the
  pages themselves.
- **Tool usage.** When a user opens a tool, the page renders
  the tool but no event is sent anywhere.
- **Form submissions.** `src/app/api/{waitlist,suggest,contact}`
  writes to Supabase, but those rows are not joined to any
  user-level identity.
- **Clicks, scrolls, time-on-page.** Nothing.
- **IP addresses, user agents.** Stripped at Cloudflare's edge;
  the `cf-ipcountry` header is the only signal we read, and we
  read it once per request, in-memory, never persisted.

The only thing the consent store knows about the user is the
JSON blob in `localStorage["wly_consent"]`, which is local to
the device, never sent to a server, and not tied to a user ID.

---

## Adding "Recently visited" / "tools you visited" later

The plan you described ("recent visit section or tools he
visited") is doable in three ways, with different consent
implications. Pick one based on your comfort with the legal
exposure.

### Option A — Local-only (lowest friction)

Store a list of recently-visited tools in `localStorage` on the
client. No server, no third party. Update happens on tool
page mount.

```ts
// example: src/lib/history.ts
const KEY = "wly_history";
const MAX = 12;

export function recordVisit(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [slug, ...list.filter((s) => s !== slug)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    // dispatch a custom event so other tabs / components react
    window.dispatchEvent(new CustomEvent("wly:history", { detail: next }));
  } catch {
    /* localStorage unavailable; degrade silently */
  }
}

export function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```

**Legal status:** local-only storage is "processing" under
GDPR and technically needs a legal basis. Two defensible
positions:

1. **Treat as essential** — argues that remembering what the
   user just looked at is part of the core UX. Works for
   short lists (the user is on the same page anyway). Doesn't
   work if the list is used for cross-session personalization
   or aggregated server-side.
2. **Add a `functional` consent category** — cleaner. The
   modal gets a fourth switch. The footer link shows it as
   "On / Off". Update the Cookies Policy to document the new
   category. Bump `CONSENT_VERSION` so existing users
   re-prompt.

I recommend **Option 2** for any feature that is used to
personalize the homepage, sidebar, or recommendations. Use
**Option 1** only for the "last 3 tools you opened" pill in
the tool header.

### Option B — Analytics-based (requires analytics consent)

When PostHog / Plausible / GA goes in (gated by
`<ConsentGate category="analytics">`), record a `$pageview`
event with the tool slug. Build the "recently visited" section
by querying that analytics tool's API for the current user's
events.

**Legal status:** clean — only users who explicitly opted in
to analytics are tracked. Region-aware: GDPR/CCPA users who
rejected analytics see an empty section or a local-only
fallback.

**Caveat:** analytics tools typically charge by event volume
or cap at a free tier. Pageview events for every tool click
can burn through quota fast.

### Option C — Server-side (requires account)

If/when user accounts ship, store `last_visited_tools` in
Supabase as a per-user column. No consent question — the user
signed in and agreed to the privacy policy, which lists this
explicitly.

**Best path:** combine A (immediate) + C (when accounts ship)

- B (optional, for opt-in users). The local list seeds the
  server-side one on first sign-in.

---

## How to add a new cookie category

If you later add, say, a "preferences" or "personalization"
category:

1. Add it to `ConsentCategory` in `src/lib/consent/types.ts`.
2. Add the corresponding boolean field to `ConsentState` and
   `DEFAULT_CONSENT`.
3. Bump `CONSENT_VERSION` from `"1.0"` to `"1.1"`. The
   version-comparison in `hasCurrentConsent()` will reject
   every existing record and re-prompt.
4. Add a `<ConsentRow>` inside
   `src/components/consent/ConsentPreferencesModal.tsx`.
5. Add the matching `consent.categories.<name>` key in
   `src/i18n/messages/{en,es,fr}.json`.
6. Update `src/content/legal/cookies-policy.tsx` (add a
   paragraph in the "What categories do you use?" section).
7. If it's a category that some integrations can be gated
   behind (analytics, advertising, etc.), update any
   `<ConsentGate category="...">` call sites.

The store's defensive JSON parser means a record from an
older schema is treated as "no decision" — so users always
get a fresh banner on upgrade.

---

## Re-prompt via version bump

Bump `CONSENT_VERSION` and every existing user will see the
banner on their next page load, regardless of their previous
choice. Useful for:

- Adding a category (above).
- Changing the legal basis wording.
- Updating the privacy policy in a way that changes what's
  being agreed to.
- A legal deadline (e.g. a new US state law).

Old records are not deleted; they just stop satisfying
`hasCurrentConsent()`. The next click overwrites the record
with the new version.

---

## How to disable the banner entirely

If you need to ship without consent (e.g. internal staging):

```tsx
// src/app/[locale]/layout.tsx
<ConsentProvider region="other" disabled>  {/* prop not yet implemented */}
```

Not currently implemented — set `ready=true && decided=true`
manually in `useConsent.tsx` if you need to. The simplest
escape hatch is to comment out the `<ConsentBanner />`
line in the layout.

---

## Testing

A Playwright probe lives at `/workspace/probe-consent.js` (not
in the repo — it's a sandbox tool). It runs the full
end-to-end flow:

```
step 1 banner shown         YES
step 2 banner after accept  hidden
step 3 stored state         analytics=true advertising=true
                            method=accept_all consentVersion=1.0
step 4 banner after reload  still hidden
step 5 modal opened         YES
step 6 analytics toggle     true -> false
step 7 stored after save    analytics=false method=custom
step 8 reload persists      analytics=false method=custom
                            banner still hidden
step 9 fresh reject all     analytics=false advertising=false
                            method=reject_all
```

For ad-hoc checks: `/api/diag/consent` shows the server-side
detected region. `/en/cookies-policy` walks through the
policy in plain English.

---

## File map

```
src/lib/consent/
  types.ts                     Schema, version constant, defaults
  region.ts                    cf-ipcountry + locale -> 'gdpr'|'ccpa'|'other'
  store.ts                     localStorage read/write/subscribe
  useConsent.tsx               <ConsentProvider> + useConsent() + <ConsentGate>

src/components/consent/
  ConsentBanner.tsx            Bottom-right card
  ConsentPreferencesModal.tsx  Three-row preferences modal
  CookiePreferencesLink.tsx    Footer trigger + reset button

src/app/[locale]/layout.tsx    Region-aware wrapper around <ConsentProvider>
src/app/api/diag/consent/      Dev-only diagnostic
src/components/layout/footer.tsx   Cookie preferences + reset links
```

---

## See also

- [API.md](./API.md) — public HTTP endpoints.
- [FRONTEND.md](./FRONTEND.md) — frontend architecture.
- [i18n-translation.md](./i18n-translation.md) — adding a new
  locale or translation.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Cloudflare + Workers deploy.
