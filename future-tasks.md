# Future Tasks — Observations Backlog

Deferred work, nice-to-haves, and ideas surfaced from ongoing
testing and observation. This is a **rolling backlog** — items
move in from [`tasks.md`](./tasks.md) when they get deprioritized
or blocked, and move out when they're ready to be worked on.

**How to use this file**

- Add items when something is observed in production, a feature
  is mentioned but not actionable, or research is needed before
  committing to work.
- Each item should have: **what**, **why**, and **rough effort**.
- Promote an item to [`tasks.md`](./tasks.md) when it's actually
  being worked on (someone has the bandwidth + the design).
- Do not duplicate items already in [`FUTURE_WORK.md`](./FUTURE_WORK.md)
  at the repo root — that's the broader parking lot for ideas,
  debt, and security items. This file is more specifically about
  _what we observed in testing_ that we want to come back to.

---

## ⚡ Performance

Items observed during live-site probing and bundle analysis.

### JS bundle size (734 KB across 9 chunks)

- **What:** the tool page loads 734 KB of JS on first visit. Largest
  chunks are 227 KB, 141 KB, 119 KB, 112 KB. Mostly Next.js
  framework + React + framer-motion + lucide-react.
- **Why it matters:** every interactive cost compounds. Mobile users
  on slow networks see 2-3s TTFB just for JS download.
- **Rough fix:** (a) lazy-load framer-motion out of tool pages
  (they don't animate anything); (b) move home-page sections to
  a separate client bundle so tool pages don't ship their code;
  (c) tree-shake lucide-react icons more aggressively (currently
  ~60 icons imported; per-page usage is <10).
- **Effort:** medium. Likely 30-50% reduction possible.

### RSC payload (75 KB per tool page)

- **What:** tool page HTML is 137 KB; 75 KB of that is the React
  Server Components serialization (`self.__next_f.push(...)` chunks).
  Includes home-page section fragments (Hero, Features, Categories,
  Waitlist) that aren't even rendered on tool pages — they're in
  the layout's component tree for prefetch purposes.
- **Why it matters:** every byte of RSC payload is downloaded +
  parsed before hydration. On a 4G connection, 75 KB is ~200ms.
- **Rough fix:** split the layout into RSC chunks (e.g., move
  home-page sections to a `<HomeSections />` slot only rendered
  on the home route, not as a layout child).
- **Effort:** medium-high. Requires rethinking the layout
  composition — might break the "consistent shell across pages"
  UX expectation.

### Worker cold start (0.73s cold vs 0.23s warm)

- **What:** first request after deploy takes 0.7s. Subsequent
  requests are 0.2s. The worker bundle is small (2.3 KB) but
  Cloudflare has to spin up an isolate.
- **Why it matters:** users who hit the site right after a deploy
  get a noticeably slow first paint.
- **Rough fix:** (a) configure Cloudflare's Smart Placement or
  always-on warmers; (b) reduce worker bundle size (helps startup
  time); (c) accept it — 0.7s cold is industry standard.
- **Effort:** low. Mostly configuration, not code.

---

## 🔍 SEO

Items observed during the pSEO launch + search-console prep.

### Per-tool unique body copy

- **What:** the tool page template renders the same generic
  hero/features/CTA copy for every tool. Only the tool NAME
  differs. So 327 pages are near-duplicates.
- **Why it matters:** Google may flag as thin/duplicate content,
  suppressing rankings. The pSEO strategy relies on each tool
  page being a unique entity in Google's index.
- **Rough fix:** add a `description` and `howItWorks` field to
  each `SubTool` in `tools-subgroups.ts`. Hand-write 50-80 words
  per tool. For the top-10 tools, add 300+ words.
- **Effort:** high if done by hand (~30 hours for 100 tools). Could
  be templated with category-specific boilerplate + tool-specific
  tweak (~5 hours).

### HowTo JSON-LD schema per tool

- **What:** currently we emit WebApplication + BreadcrumbList on
  tool pages. Google's "HowTo" rich results are particularly
  valuable for utility tools ("Merge PDF in 3 steps").
- **Why it matters:** HowTo rich results show step-by-step
  instructions in SERP. Higher CTR than plain blue links.
- **Rough fix:** add `HowTo` schema with 3-5 steps per tool
  ("1. Upload your PDF files. 2. Click Merge. 3. Download merged
  file."). Requires the per-tool body copy above.
- **Effort:** small. Maybe 1-2 hours once body copy exists.

### WebApplication featureList per tool

- **What:** currently the WebApplication schema has empty/null
  featureList. Google may use it for ranking.
- **Why it matters:** featureList is one of the few WebApplication
  fields Google actually surfaces in rich results.
- **Rough fix:** populate featureList per tool with 3-5
  capabilities ("Merge multiple PDFs", "Reorder pages", "No
  upload to server", "Free, no signup").
- **Effort:** small (~2 hours). Mostly data entry in
  `tools-subgroups.ts`.

### Backlink strategy

- **What:** zero backlinks currently. Without external links,
  pSEO pages won't rank even if the content is perfect.
- **Why it matters:** Domain Authority / PageRank is one of the
  strongest ranking signals.
- **Rough fix:** (a) submit to directories (see tasks.md); (b)
  guest posts on tool-related publications; (c) HARO / Featured.com
  for source quotes; (d) Reddit/HN organic participation.
- **Effort:** ongoing. 2-5 hours/week.

---

## ✏️ Content

Items that improve the actual content (not structure).

### Per-tool OG image

- **What:** every tool page uses the site default OG image.
  Social shares look generic.
- **Why it matters:** unique OG images get higher CTR on Twitter/X,
  LinkedIn, etc. 1.5-2x lift on share CTR is typical.
- **Rough fix:** add `opengraph-image.tsx` per tool page that
  renders the tool's colored icon + name on a tinted background.
  ~30 lines of code, 100 files generated.
- **Effort:** small (~3 hours). High impact when shared.

### Per-tool FAQ section

- **What:** tool pages have a "What this tool will do" section
  with 5 generic features. No FAQ. Google loves FAQPage schema.
- **Why it matters:** FAQ rich results, "People Also Ask" boxes,
  and longer-tail keyword capture ("Is merge-pdf free?", "Does
  merge-pdf work offline?").
- **Rough fix:** add a `faqs` array per tool with 3 Q&As.
  Hand-write the top-10, templated for the rest.
- **Effort:** medium. 1-2 hours for top-10, then templated.

### Real success-state for tool pages (not "Coming Soon")

- **What:** currently every tool page is a placeholder with email
  signup CTA. When the first tool ships, the placeholder needs
  to be replaced with the actual tool UI.
- **Why it matters:** placeholder pages rank poorly long-term
  (Google demotes "thin affiliate" style pages over time).
- **Rough fix:** when a tool is ready, swap the Hero section
  to a real tool interface (PDF upload widget, image editor, etc.).
  Keep the email CTA as a fallback.
- **Effort:** per-tool. Will take weeks of work across the team.

---

## ♿ UX / Accessibility

Items noticed during testing.

### Keyboard navigation in mega menu

- **What:** the mega menu opens on hover (desktop) and on click
  (any device). Keyboard users can Tab into a chip but opening
  the panel via keyboard needs verification.
- **Why it matters:** WCAG 2.1.1 (Keyboard) requires all
  functionality to be operable via keyboard.
- **Rough fix:** add `onFocus` handler that opens the panel
  when the chip receives keyboard focus. Add `Esc` to close
  (already done). Add arrow keys to move between chips.
- **Effort:** small. ~2 hours.

### Focus ring visibility on colored chip tiles

- **What:** the colored icon tiles in the mega menu might not
  have a visible focus ring on keyboard navigation.
- **Why it matters:** WCAG 2.4.7 (Focus Visible). Users need to
  know which element has focus.
- **Rough fix:** add `focus-visible:ring-2 focus-visible:ring-primary`
  to each chip + sub-tool link.
- **Effort:** trivial. ~15 minutes.

### Mega menu disclosure pattern

- **What:** the mega menu currently uses hover-to-open which is
  an "on hover" pattern. WAI-ARIA recommends either a menu button
  (with aria-haspopup) or a disclosure pattern.
- **Why it matters:** screen readers should announce the
  relationship between the chip and the panel.
- **Rough fix:** confirm `aria-haspopup="menu"` is set (already
  is) and add `aria-controls="tools-mega-panel"` linking the chip
  to the panel id. Add `aria-expanded` (already there).
- **Effort:** small. Verify + minor tweaks.

---

## 🛠️ Infrastructure / DevOps

Items to make ops smoother.

### Auto-submit to IndexNow after deploy

- **What:** currently we have to manually submit URLs to IndexNow
  after every deploy. Add a step in `.github/workflows/deploy.yml`.
- **Why it matters:** instant indexing = faster ranking for new
  tool pages as we add them.
- **Rough fix:** after the deploy step succeeds, run a curl
  POST to https://api.indexnow.org/indexnow with the list of
  changed URLs.
- **Effort:** small. ~30 minutes.

### Lighthouse CI in deploy pipeline

- **What:** run Lighthouse on the home page and one tool page
  after every deploy. Fail the deploy if Performance < 80.
- **Why it matters:** catches perf regressions before they reach
  users.
- **Rough fix:** add a step to `.github/workflows/deploy.yml`
  that runs `npx @lhci/cli autorun --collect.url=https://widgetly.tech/en`
  (assuming we expose the deployed URL to CI).
- **Effort:** small. ~1 hour.

### Migrate legacy flat docs to DOX shape

- **What:** `docs/DEPLOYMENT.md`, `docs/CONSENT.md`,
  `docs/FRONTEND.md`, `docs/LAUNCH_INDEXABILITY.md`,
  `docs/i18n-translation.md` are still flat files outside the
  DOX AGENTS.md pattern.
- **Why it matters:** inconsistent docs structure. New contributors
  won't know which file to read first.
- **Rough fix:** convert each to `docs/<domain>/AGENTS.md` with
  the DOX section order.
- **Effort:** medium. ~2 hours per doc.

### Custom 404 page

- **What:** currently the 404 page is the default Next.js
  not-found. Boring and unhelpful.
- **Why it matters:** visitors who hit a broken link should get
  a useful landing, not a 404.
- **Rough fix:** create `src/app/[locale]/not-found.tsx` with a
  branded 404 design + links to popular categories.
- **Effort:** small. ~1 hour.

### Add `widgetly.app` → `widgetly.tech` redirects at the edge

- **What:** the legacy `widgetly.app` domain is still serving
  (we have 6 burned PATs from it). Users who type widgetly.app
  get redirected at the Cloudflare edge.
- **Why it matters:** some backlinks and bookmarks still point
  at widgetly.app. Without an edge redirect, those visitors
  see a broken site or DNS error.
- **Rough fix:** in Cloudflare dashboard, add a Page Rule
  redirecting widgetly.app/\* → https://widgetly.tech/$1 (301).
- **Effort:** trivial. Cloudflare UI. ~5 minutes.

---

## 🎯 Marketing / Growth

Items beyond technical debt.

### A/B test the waitlist CTA copy

- **What:** the home page CTA says "Join the waitlist". Could
  try "Get early access", "Be the first to try it", etc.
- **Why it matters:** small wording changes can shift conversion
  10-30%.
- **Rough fix:** add a Plausible goal for waitlist submission,
  rotate variants via a cookie-based A/B test, measure.
- **Effort:** medium. Needs Plausible custom events + variant
  serving. ~1 day.

### Custom 404 → category suggestion

- **What:** instead of a generic 404, show the user the closest
  matching category (e.g., if they hit /tools/colour-corrector,
  suggest /tools/image).
- **Why it matters:** recoups would-be 404 traffic.
- **Rough fix:** Levenshtein distance on slug → top match.
- **Effort:** small. ~3 hours.

### Schema for FAQPage on tool pages (after content exists)

- **What:** once each tool has its own FAQ, emit a per-tool
  FAQPage schema (currently only home has FAQPage).
- **Why it matters:** FAQ rich results on long-tail tool
  queries.
- **Rough fix:** add `faqJsonLd(tool.faqs)` to the tool page
  page.tsx once `tool.faqs` exists.
- **Effort:** trivial. ~30 minutes once data exists.

---

_Last updated: 2026-06-17. Refresh after each deploy or major
observation in production._
