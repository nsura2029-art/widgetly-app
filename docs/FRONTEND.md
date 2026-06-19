# Frontend Architecture

How the Widgetly web app is organized. For a tour of the
public-facing API and the deploy story, see
[API.md](./API.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Stack

| Layer         | Choice                              | Why                                                                                 |
| ------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| Framework     | Next.js 16.2.9 (App Router)         | RSC, SSG, file-based routing, edge runtime support, all the boring infra done well. |
| Runtime       | Cloudflare Workers (via OpenNext)   | Edge SSR, no origin server, sub-100ms cold starts.                                  |
| Language      | TypeScript 5                        | Strict mode. Zod for runtime validation gives end-to-end type safety.               |
| Styling       | Tailwind v4 + CSS custom properties | One CSS file (`globals.css`) holds the design tokens; Tailwind resolves to them.    |
| UI primitives | Custom (button, input, badge, card) | Small set tuned to the brand; no Radix/shadcn dependency for a launch surface.      |
| Animation     | framer-motion                       | Used sparingly — hero typewriter, hero entrance, mobile menu.                       |
| Icons         | lucide-react                        | Tree-shakable, consistent stroke weight, ~1500 icons.                               |
| Validation    | zod 3.x                             | Schema-as-source-of-truth for the API; runtime parsing in route handlers.           |
| API docs      | swagger-ui-dist 5.x                 | Static assets copied to `public/api-docs/`, mounted at `/docs`.                     |
| Lint          | ESLint + prettier + Tailwind plugin | Pre-commit via husky + lint-staged.                                                 |
| Tests         | (not yet — see "Testing" below)     | Smoke tests via the dev server + curl. Playwright used for visual verification.     |

## Directory layout

```
widgetly-app/
├── docs/                       ← this directory
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── FRONTEND.md            ← you are here
│   └── LAUNCH_INDEXABILITY.md
├── public/                    ← served verbatim at site root
│   ├── api-docs/              ← swagger-ui assets (copied from node_modules)
│   ├── images/
│   │   └── landmarks/         ← hand-drawn SVGs for /about
│   ├── _headers               ← Cloudflare Pages-style headers (security, caching)
│   ├── favicon.svg
│   ├── icon.svg
│   ├── og-image.svg
│   ├── robots.txt
│   └── site.webmanifest
├── src/
│   ├── app/                   ← Next.js App Router pages
│   │   ├── (routes...)
│   │   ├── api/               ← Route handlers
│   │   │   ├── contact/route.ts
│   │   │   ├── openapi.json/route.ts
│   │   │   ├── suggest/route.ts
│   │   │   └── waitlist/route.ts
│   │   ├── blog/
│   │   ├── contact/           ← page.tsx (server) + contact-client.tsx (form)
│   │   ├── docs/page.tsx
│   │   ├── help/page.tsx
│   │   ├── suggest/           ← page.tsx + suggest-client.tsx
│   │   ├── tools/              ← index + [category] dynamic
│   │   ├── layout.tsx         ← root layout, JSON-LD, fonts, theme
│   │   ├── page.tsx           ← homepage
│   │   ├── sitemap.ts         ← dynamic XML sitemap
│   │   └── robots.ts          ← dynamic robots.txt
│   ├── components/
│   │   ├── about/landmarks-collage.tsx
│   │   ├── ads/ad-zone.tsx
│   │   ├── landing/            ← hero, search-mockup, features, etc.
│   │   ├── layout/             ← header, footer, breadcrumb, page-shell
│   │   ├── legal/LegalLayout.tsx
│   │   ├── shared/             ← logo, accent, animated background
│   │   └── ui/                 ← button, input, badge, card
│   ├── content/
│   │   └── legal/              ← privacy / terms / cookies / security content
│   ├── hooks/                  ← use-countdown, use-mounted
│   ├── lib/
│   │   ├── api/                ← Zod schemas, response helpers, OpenAPI spec
│   │   ├── seo.ts              ← buildMetadata(), viewport, JSON-LD builders
│   │   ├── seo-schemas.ts      ← article, breadcrumb, blog, FAQ JSON-LD
│   │   ├── tools-categories.ts ← /tools/[category] registry
│   │   ├── blog.ts             ← blog post registry
│   │   ├── constants.ts        ← SITE_CONFIG, NAV_LINKS, FOOTER_LINKS, etc.
│   │   ├── breadcrumbs.ts      ← breadcrumb generator
│   │   └── utils.ts            ← cn(), formatters
│   └── types/                  ← shared TS types
├── next.config.ts              ← redirects + image config
├── wrangler.toml               ← Cloudflare Workers config
├── open-next.config.ts         ← OpenNext adapter
└── package.json
```

## Routing

| Path                    | Source                                  | Rendering                                   |
| ----------------------- | --------------------------------------- | ------------------------------------------- |
| `/`                     | `src/app/page.tsx`                      | SSG                                         |
| `/about`                | `src/app/about/page.tsx`                | SSG                                         |
| `/blog`                 | `src/app/blog/page.tsx`                 | SSG                                         |
| `/blog/category/[slug]` | `src/app/blog/category/[slug]/page.tsx` | SSG (`generateStaticParams`)                |
| `/blog/post/[slug]`     | `src/app/blog/post/[slug]/page.tsx`     | SSG (`generateStaticParams`)                |
| `/contact`              | `src/app/contact/page.tsx` (server)     | SSG; hydrates `contact-client.tsx` (client) |
| `/cookies-policy`       | `src/app/cookies-policy/page.tsx`       | SSG                                         |
| `/docs`                 | `src/app/docs/page.tsx`                 | SSG; mounts Swagger UI                      |
| `/help`                 | `src/app/help/page.tsx`                 | SSG                                         |
| `/privacy-policy`       | `src/app/privacy-policy/page.tsx`       | SSG                                         |
| `/security`             | `src/app/security/page.tsx`             | SSG                                         |
| `/sitemap.xml`          | `src/app/sitemap.ts`                    | SSG (dynamic XML)                           |
| `/robots.txt`           | `src/app/robots.ts`                     | SSG (dynamic text)                          |
| `/suggest`              | `src/app/suggest/page.tsx` (server)     | SSG; hydrates `suggest-client.tsx` (client) |
| `/terms-and-conditions` | `src/app/terms-and-conditions/page.tsx` | SSG                                         |
| `/tools`                | `src/app/tools/page.tsx`                | SSG                                         |
| `/tools/[category]`     | `src/app/tools/[category]/page.tsx`     | SSG (11 categories)                         |
| `/api/waitlist`         | `src/app/api/waitlist/route.ts`         | Edge (POST)                                 |
| `/api/suggest`          | `src/app/api/suggest/route.ts`          | Edge (POST)                                 |
| `/api/contact`          | `src/app/api/contact/route.ts`          | Edge (POST)                                 |
| `/api/openapi.json`     | `src/app/api/openapi.json/route.ts`     | Edge (GET)                                  |

Redirects (`next.config.ts`):

- `/blog/:slug` → `/blog/post/:slug` (308)
- `/terms` → `/terms-and-conditions` (308)

## Forms: server / client split

The contact and suggest pages use a two-file pattern so we can
export `metadata` (server-only) from the page while keeping the
form's interactive state on the client.

```
src/app/contact/
├── page.tsx            ← server component: export const metadata; render <ContactClient />
└── contact-client.tsx  ← "use client": useState, fetch /api/contact, error/success state
```

The page renders the server-side `<BreadcrumbConfig>` and the
JSON-LD script, then hands off to the client component for the
interactive part. The benefit: the page is fully crawlable (title,
description, canonical, JSON-LD in the SSR'd HTML) AND the form
works with real fetch + error handling on the client.

## Hero search (typewriter + auto-focus hybrid)

`src/components/landing/search-mockup.tsx` is a single component
that layers a typewriter animation on top of a real `<input>`:

- **Default:** typewriter animates a cycling list of example
  queries. The real input is empty and not focused, so the
  animation is visible.
- **On focus:** the overlay disappears, the cursor lands in
  the real input, the user types normally.
- **On blur (if empty):** the animation resumes from the next
  example.

The state is a single `useState` triple: `index`, `typed`, plus
`value` and `isFocused`. Two `useEffect` hooks — one runs the
typewriter, one cycles to the next example after a hold — short
circuit when `isFocused || value` is truthy, so engagement wins.

## Legal pages (`LegalLayout.tsx`)

The four legal pages (Privacy / Terms / Cookies / Security) share
a single layout that handles:

- **Sticky TOC on the left** (active section highlighted via
  `IntersectionObserver`)
- **"30-second version" callout** above the legal body when the
  content file exports a `PLAIN_ENGLISH` string
- **Reading-progress bar** (2px line under the header) with
  ARIA `role="progressbar"`
- **Bottom CTA** (Contact us / Suggest a tool) with a "Related
  documents" rail underneath

Page wrappers pass their own `toc` (a list of `{ id, label }`
matching the `<h2 id>` anchors in the content), `plainEnglish`,
and `related` props. Content lives in `src/content/legal/*.tsx`
and is content-only — no client-side state.

## SEO + JSON-LD

`src/lib/seo.ts` is the single source of truth for `<head>`
metadata. The `buildMetadata()` helper:

- Sets the title with the site name as suffix
- Computes the canonical URL from the path
- Emits OG image, Twitter card, robots, keywords
- Reserved slot for `NEXT_PUBLIC_GOOGLE_VERIFICATION` etc.

`src/lib/seo-schemas.ts` provides JSON-LD builders:
`articleJsonLd`, `blogJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`,
`itemListJsonLd`. The root layout emits WebSite + Organization +
SoftwareApplication + FAQ on every page; page-level JSON-LD
(WebPage, BreadcrumbList, ItemList, BlogPosting, Article) is
added by individual page components.

`src/lib/api/openapi.ts` is the hand-maintained OpenAPI 3.0 spec
that powers `/api/openapi.json` and the Swagger UI at `/docs`.

## Styling

The shared `.container` rail is full-width responsive and caps at 100rem
(1600px) on wide viewports. It uses 16px inline padding on mobile and
24px on tablet/desktop. Header, featured tools, breadcrumb, hero,
PageShell, and footer content should use that rail so horizontal
alignment stays consistent while section backgrounds remain full-bleed.

Tailwind v4 reads the design tokens from `src/app/globals.css`
via the `@theme` block. To add or change a color:

```css
/* src/app/globals.css */
@theme {
  --color-primary: #5b6cff;
  --color-primary-600: #4a5ae5; /* new */
  --radius-2xl: 1.5rem;
}
```

Then use it in any component:

```tsx
<div className="bg-primary text-primary-foreground rounded-2xl">…</div>
```

Don't define Tailwind classes in the wrong layer — no `theme: extend`
in JS, no `@apply` for one-off utilities. Tokens go in `globals.css`,
utilities compose in JSX.

## Performance posture

- **Largest Content Paint:** sub-100ms on the homepage. Hero
  text is the LCP element, no large images.
- **Cumulative Layout Shift:** 0.000 across the site. Every
  `<img>` has `width`/`height`; every card has reserved space.
- **Interaction to Next Paint:** well under 200ms. The biggest
  JS payload is framer-motion (hero entrance), and it's deferred
  to after the first paint.
- **Bundle size:** ~150KB first-load JS for the homepage, ~190KB
  for `/contact` and `/suggest` (forms are client components).
  The `/docs` page adds the 1.5MB swagger-ui bundle — only loaded
  when the docs page is visited.

## Accessibility

- All interactive elements are real `<button>` / `<a>` / `<input>`
  (no `<div onClick>`).
- Form inputs have associated `<label htmlFor>`.
- The Skip-to-content link is the first focusable element on
  every page (`<a href="#main">`).
- The reading-progress bar has `role="progressbar"` +
  `aria-valuenow/min/max`.
- Color contrast meets WCAG AA in the body copy. The brand
  gradient on white passes; the gray-700 on white passes; the
  amber-on-amber callout in the legal pages passes.
- The typewriter on the hero announces itself to screen readers
  via `aria-hidden="true"` (the real input is what gets
  announced).

## Testing

The branch doesn't ship unit tests yet — the smoke test is the
swarm of curl + Playwright probes in the build verification. The
recommended unit-test setup when adding tests:

- **Vitest** for `lib/` (schemas, helpers, seo, tools-categories).
- **Playwright** for the form flows and the Swagger UI render.
- **MSW (Mock Service Worker)** for the API client behavior in
  the contact and suggest client components.

Add a `pnpm test` script in `package.json` that runs both. The
pre-commit hook should run type-check + lint; full test runs go
in CI before deploy.

## Adding a new page

1. **Pick a route.** Add the file under `src/app/<route>/page.tsx`.
2. **Export metadata.** `export const metadata: Metadata =
buildMetadata({ title, description, path, keywords });`
3. **Add JSON-LD if needed.** Page-specific schema (BreadcrumbList,
   WebPage, etc.) as a `<script type="application/ld+json">` block.
4. **Compose the body** from `PageShell` + the standard section
   components. If it's a form page, split into server (page.tsx)
   - client (`<name>-client.tsx`) for metadata + form state.
5. **Add to the sitemap** if it's a new public URL.
   `src/app/sitemap.ts` is a hand-maintained list; append the new
   route with the right `changeFrequency` and `priority`.
6. **Add nav links** if it's a top-level destination. Footer is
   `FOOTER_LINKS` in `src/lib/constants.ts`; top nav is
   `NAV_LINKS` in the same file.

## Adding a new tool category

1. **Append to `src/lib/tools-categories.ts`.** Copy an existing
   entry, give it a unique short slug (used in the URL), name,
   headline, pitch, intro, keywords, and a handful of example
   tool names.
2. **That's it.** The new category automatically appears at
   `/tools/<slug>`, in the `/tools` index, in the footer "PDF
   Tools / Image Tools / …" rail, in the sitemap, and in the
   keyword strategy across the relevant pages.

The "single source of truth" pattern means there is no
secondary list to keep in sync. Add an entry, push, ship.

## Conventions

- **Components:** named exports. No default exports except for
  Next.js page/layout files (which require it).
- **Class composition:** use the `cn()` helper (`src/lib/utils.ts`).
  No template-literal classNames, no array `.join(" ")` outside
  the helper.
- **Icons:** lucide-react only. Pass `aria-hidden="true"` on
  decorative icons; pair with visible text on functional ones.
- **File naming:** kebab-case for files, PascalCase for
  components. Page components live in `page.tsx`; the
  accompanying client component is `<name>-client.tsx`.
- **Imports:** `@/` alias to `src/`. No relative `../../..` imports.
- **Comments:** JSDoc on every exported function. Explain _why_,
  not _what_. The code should be self-documenting for the _what_.
