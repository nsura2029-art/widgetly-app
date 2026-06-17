# AGENTS.md — SEO

Owns the SEO surface of Widgetly: how the site is crawled, indexed, ranked, and surfaced in search results.

---

## Purpose

- Make every tool page (PDF, Image, AI, etc.) discoverable for its target long-tail keyword.
- Ship programmatic SEO: 109 unique tool URLs × 3 locales = **327 indexable pages** pre-rendered at build time.
- Maintain canonical URLs, hreflang alternates, structured data, and a clean sitemap.
- Run a manual outreach checklist to earn initial backlinks and verify ownership in search consoles.

---

## Ownership

| Surface            | File / location                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Sitemap            | `src/app/[locale]/sitemap.ts`                                                                                                            |
| Robots             | `src/app/[locale]/robots.ts`                                                                                                             |
| Per-page metadata  | `src/lib/seo.ts` (helper) + `generateMetadata` in each route                                                                             |
| JSON-LD builders   | `src/lib/seo.ts` (`websiteJsonLd`, `organizationJsonLd`, `softwareApplicationJsonLd`, `faqJsonLd`, `breadcrumbJsonLd`, `itemListJsonLd`) |
| Open Graph images  | `opengraph-image.tsx` files (one per route that needs custom)                                                                            |
| Per-tool pages     | `src/app/[locale]/tools/[category]/[tool]/page.tsx`                                                                                      |
| Per-tool data      | `src/lib/tools-pages.ts`                                                                                                                 |
| Analytics env vars | `NEXT_PUBLIC_GOOGLE_VERIFICATION`, `NEXT_PUBLIC_BING_VERIFICATION`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`                                      |
| Plausible script   | injected in `src/app/[locale]/layout.tsx`                                                                                                |

---

## Local Contracts

### Canonical URLs

- Every page sets `alternates.canonical` via `buildMetadata({ path })`.
- Locale-prefixed URLs are the canonical form. `/en/tools/pdf/merge-pdf` is canonical; never `/tools/pdf/merge-pdf`.
- The [locale] layout applies `alternates.languages` for en/es/fr hreflang.

### Title format

- Pattern: `<Page Title> | Widgetly` (single brand suffix — layout template wraps).
- Per-page title is set via `buildMetadata({ title })`. Don't append ` | Widgetly` manually; the layout's title template (`%s | Widgetly`) handles it.
- OG/Twitter titles are appended by `buildMetadata` itself (those don't use the layout template).

### JSON-LD

- WebSite + SearchAction on home.
- Organization + sameAs on home (only emit `sameAs` URLs that actually resolve).
- SoftwareApplication on home (the platform).
- WebApplication on every per-tool page.
- WebPage + BreadcrumbList + ItemList on every per-category page.
- FAQPage on any page with a visible FAQ section.
- All JSON-LD is server-rendered; no user input reaches the JSON string.

### Sitemap

- `dynamic = "force-static"` — sitemap is built at deploy time, not per-request.
- One entry per locale-variant of every static page.
- Includes home, marketing anchors (#features, #categories, #waitlist, #faq), /tools index, every /tools/[category], every /tools/[category]/[tool], every blog post, every suggestion.
- Per-tool URL priority: 0.7 (below category pages at 0.8).

### Robots

- Allow all crawlers by default.
- Block `/api/` and `/_next/`.
- Explicitly allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).
- Block SEO scrapers (AhrefsBot, SemrushBot, MJ12bot).

### Per-tool page requirements

- Title: `<Tool Name> — Free Online <Tool Name> Tool` (max 60 chars).
- Description: ~120 chars, includes category keyword + privacy signal + "coming soon".
- H1: `<Tool Name> — coming soon to Widgetly`.
- Body copy: minimum 300 unique words per page (currently template-only; flag if a page drops below).
- `WebApplication` JSON-LD with `offers.price: "0"` and `availability: "PreOrder"`.
- BreadcrumbList with 4 levels: Home > Tools > Category > Tool.

---

## Work Guidance

### When you add a new tool category

1. Add the category to `src/lib/tools-categories.ts` (slug, name, examples, keywords).
2. If the category should appear in the banner, add it to `FEATURED_SLUGS` in `src/components/layout/tools-banner.tsx` and define `TOOLS_SUBGROUPS` for it in `src/lib/tools-subgroups.ts`.
3. Add the category to `getAllToolPages()` automatically picks it up. No additional work.
4. Verify sitemap includes the new tool URLs after deploy.

### When you add a new per-tool page (manually, not via groups)

- Add the tool name to the appropriate category's `examples` in `tools-categories.ts`, OR add it to the relevant `TOOLS_SUBGROUPS[category].items` for richer data.
- The page is generated automatically by `generateStaticParams` in `src/app/[locale]/tools/[category]/[tool]/page.tsx`.

### When you change the title format

- Update `buildMetadata` in `src/lib/seo.ts` AND the [locale] layout's `title.template` together. They must stay in sync or titles will render with the brand twice.

### When you change structured data

- Validate at https://validator.schema.org/ before merging.
- Run the Rich Results Test at https://search.google.com/test/rich-results for any page type you change.

### Manual outreach checklist

#### 1. Search Console verification

1. https://search.google.com/search-console/welcome → Add property → URL prefix → `https://widgetly.tech`.
2. Verification: HTML tag → set `NEXT_PUBLIC_GOOGLE_VERIFICATION` in `.env.local`.
3. `pnpm setup:secrets` → wait for deploy → click Verify.
4. Submit sitemap: Sitemaps → enter `sitemap.xml`.

#### 2. Bing Webmaster Tools

1. https://www.bing.com/webmasters → Add site → `https://widgetly.tech`.
2. Verification: HTML meta tag → set `NEXT_PUBLIC_BING_VERIFICATION` in `.env.local`.
3. `pnpm setup:secrets` → wait for deploy → Verify.
4. Submit sitemap.

#### 3. IndexNow (instant indexing)

1. Generate key at https://www.indexnow.org/key (a single string).
2. Save the key as `public/<key>.txt` (just the key string as plain text).
3. After every deploy, ping the new/changed URLs:
   ```bash
   curl -X POST "https://api.indexnow.org/indexnow" \
     -H "Content-Type: application/json" \
     -d '{
       "host": "widgetly.tech",
       "key": "<your-key>",
       "urlList": [
         "https://widgetly.tech/tools/pdf/merge-pdf",
         ...
       ]
     }'
   ```
4. To auto-submit on every deploy, add a `pnpm deploy:indexnow` step in `.github/workflows/deploy.yml` that runs after the deploy step succeeds.

#### 4. Analytics

- Plausible (recommended): add `<script defer data-domain="widgetly.tech" src="https://plausible.io/js/script.js" />` in `src/app/[locale]/layout.tsx` body.
- GA4 alternative: set `NEXT_PUBLIC_GA_MEASUREMENT_ID` and use `next/script` with `strategy="afterInteractive"`.

#### 5. Directory submissions (do these once)

| Directory              | URL                                    | Notes                                                |
| ---------------------- | -------------------------------------- | ---------------------------------------------------- |
| Product Hunt           | https://www.producthunt.com/posts/new  | DA 91, best launch day                               |
| BetaList               | https://betalist.com/submit            | Free, startup-focused                                |
| Indie Hackers          | https://www.indiehackers.com/post      | Community + profile link                             |
| AlternativeTo          | https://alternativeto.net/submit       | Tool-specific, target iLovePDF/SmallPDF alternatives |
| There's An AI For That | https://theresanaiforthat.com/submit/  | AI tools directory                                   |
| AI Tool Hub            | https://aitoolhub.org/submit           | AI tools directory                                   |
| Crunchbase             | https://www.crunchbase.com/add-company | Free company profile                                 |
| Hacker News (Show HN)  | https://news.ycombinator.com/show      | High-converting if it hits front page                |

#### 6. Backlink strategy (ongoing)

- **Guest posts:** target Ahrefs blog, Search Engine Journal, Smashing Magazine, CSS-Tricks.
- **Forum/community:** Reddit (r/webdev, r/productivity, r/privacy), Hacker News, Stack Overflow (answer tool-related questions).
- **HARO / Featured.com:** sign up as a source; journalists quote you and link back.
- **Competitor backlink analysis:** identify iLovePDF, SmallPDF, iLoveIMG, pdf24 backlinks via ahrefs.com/backlink-checker (free) or openlinkprofiler.org; pursue same-source links.

#### 7. Page-speed verification

- PageSpeed Insights: https://pagespeed.web.dev/ — target Performance 90+, LCP < 2.5s.
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly.
- Real-user Core Web Vitals appear in GSC after 28 days.

---

## Verification

| Check                 | Command / URL                               | Pass criterion                           |
| --------------------- | ------------------------------------------- | ---------------------------------------- |
| Sitemap reachable     | `curl https://widgetly.tech/sitemap.xml`    | returns valid XML, includes recent URLs  |
| Robots reachable      | `curl https://widgetly.tech/robots.txt`     | includes `Sitemap:` line, blocks `/api/` |
| Per-page title format | `curl -s <url> \| grep '<title>'`           | exactly one `\| Widgetly` suffix         |
| JSON-LD valid         | https://validator.schema.org/               | no errors                                |
| Rich results          | https://search.google.com/test/rich-results | WebApplication + BreadcrumbList detected |
| Hreflang              | `curl -s <url> \| grep 'hreflang'`          | en, es, fr entries present               |
| Page speed            | https://pagespeed.web.dev/                  | Performance ≥ 90                         |

---

## Child DOX Index

_No children. This AGENTS.md owns the SEO surface entirely._
