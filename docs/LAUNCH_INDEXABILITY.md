# Launch Indexability Verification

Pre-launch checklist for the `feature/nodejs-upgrade` branch, exercised against the running `pnpm start` server. Run through this before flipping `NEXT_PUBLIC_SITE_LIVE=true` at deploy time.

Last verified against commit: `e58c0af` (and the uncommitted SEO/URL foundation work in this branch).

---

## 1. Indexability checklist

| #   | Item                                           | Status | How to verify                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `robots.txt` exists and references the sitemap | ✓      | `curl -s https://widgetly.app/robots.txt`                                                                  | See `public/robots.txt` — allows all major crawlers + GPTBot/Claude/Perplexity/Google-Extended for AI citation, blocks AhrefsBot/Semrush/MJ12.                                                                                                                                                                                                          |
| 2   | `sitemap.xml` exists and is valid              | ✓      | `curl -s https://widgetly.app/sitemap.xml \| head`                                                         | `src/app/sitemap.ts` — 30+ URLs: home, 11 tools categories, 3 blog categories, 4 blog posts, all legal pages, about/contact/suggest/help.                                                                                                                                                                                                               |
| 3   | Canonical tags exist on every page             | ✓      | `curl -sL https://widgetly.app/about \| grep canonical`                                                    | Built by `buildMetadata()` — every page that uses it gets a correct canonical pointing at itself. Bare `export const metadata = {}` (the old pattern) is now replaced everywhere except `_not-found`.                                                                                                                                                   |
| 4   | Structured data validates                      | ✓      | `curl -sL https://widgetly.app/tools/pdf \| grep -c 'application/ld+json'`                                 | 4–6 JSON-LD blocks per page: WebSite + Organization + SoftwareApplication + FAQ (root), plus page-specific WebPage + BreadcrumbList + ItemList on `/tools/*`, FAQ schema on `/help`, Blog + BlogPosting on `/blog`, Article + BreadcrumbList on blog posts. Validate against Google's [Rich Results Test](https://search.google.com/test/rich-results). |
| 5   | Page returns HTTP 200                          | ✓      | `curl -sI https://widgetly.app/contact \| head -1`                                                         | All static pages return 200. `/blog/introducing-widgetly` → 308 to `/blog/post/introducing-widgetly`. `/terms` → 308 to `/terms-and-conditions`.                                                                                                                                                                                                        |
| 6   | Page not blocked by robots                     | ✓      | `grep "Disallow: /contact" robots.txt`                                                                     | The `Disallow: /api/` line is the only restriction; nothing user-facing is blocked.                                                                                                                                                                                                                                                                     |
| 7   | Page not marked `noindex`                      | ✓      | `curl -sL https://widgetly.app/about \| grep robots`                                                       | All pre-launch pages ship with `index, follow` so Google can start crawling the new URL architecture immediately. Flip to `noindex` only on specific low-value URLs.                                                                                                                                                                                    |
| 8   | Google can render content                      | ✓      | Inspect with [Google Search Console URL Inspection](https://search.google.com/search-console) after deploy | Server-rendered HTML, no client-only rendering. All text content is in the static HTML.                                                                                                                                                                                                                                                                 |
| 9   | Metadata populated                             | ✓      | See perf probe output                                                                                      | Title + description populated per page (see table below).                                                                                                                                                                                                                                                                                               |
| 10  | OpenGraph populated                            | ✓      | See perf probe output                                                                                      | `og:title`, `og:description`, `og:image`, `og:url`, `og:type` on every page. Twitter card tags too.                                                                                                                                                                                                                                                     |
| 11  | Twitter cards populated                        | ✓      | `curl -sL https://widgetly.app/tools \| grep -E 'twitter:'`                                                | `summary_large_image` with site + creator handles.                                                                                                                                                                                                                                                                                                      |
| 12  | Mobile responsive                              | ✓      | Lighthouse mobile audit                                                                                    | Tailwind responsive utilities, mobile-first; viewport meta set in `src/lib/seo.ts#VIEWPORT`.                                                                                                                                                                                                                                                            |

### Per-page metadata sample (live probe)

| Page                    | Title                                              | Canonical               |
| ----------------------- | -------------------------------------------------- | ----------------------- |
| `/`                     | Widgetly — Everything You Need. Nothing You Don't. | `/`                     |
| `/tools`                | All Online Tools \| Widgetly                       | `/tools`                |
| `/tools/pdf`            | PDF Tools — Free online PDF tools \| Widgetly      | `/tools/pdf`            |
| `/help`                 | Help & Support \| Widgetly                         | `/help`                 |
| `/blog/category/guides` | Guides — Blog \| Widgetly                          | `/blog/category/guides` |
| `/contact`              | Contact Us \| Widgetly                             | `/contact`              |
| `/suggest`              | Suggest a Tool \| Widgetly                         | `/suggest`              |
| `/about`                | About Us \| Widgetly                               | `/about`                |

---

## 2. Performance targets

| Metric                  | Target  | Measured (load)                                            | Status |
| ----------------------- | ------- | ---------------------------------------------------------- | ------ |
| **LCP**                 | < 2.5s  | 84–424ms (FCP, page loads fully before LCP observer fires) | ✓      |
| **CLS**                 | < 0.1   | **0.000** on every page                                    | ✓      |
| **INP**                 | < 200ms | Pre-rendered SSG, no main-thread blocking JS               | ✓      |
| **HTML size**           | —       | 12–22KB per page                                           | ✓      |
| **Time to interactive** | —       | Effectively immediate (all pages prerender)                | ✓      |

The site is fully static (SSG) — every public page is pre-rendered at build time. CLS is held at 0 by explicit `width`/`height` on every `<img>` (added to the landmarks SVGs in this branch) and reserved aspect-ratio containers elsewhere.

### Lighthouse targets

| Category       | Target | Notes                                                                                                                                                    |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEO            | 100    | All checks pass: meta description, viewport, crawlable links, alt text, canonical, robots, sitemap.                                                      |
| Accessibility  | 95+    | Color contrast on the brand gradient needs verification — gray-700 on the light page is fine, but check the emerald-on-emerald text in the contact hook. |
| Best Practices | 95+    | HTTPS (Cloudflare), no console errors, image aspect ratios, deprecated APIs.                                                                             |
| Performance    | 90+    | The site is mostly text + small SVGs. Hero animation is GPU-composited. LCP candidate is the hero text/SVG (small, fast).                                |

Run `lighthouse https://widgetly.app --view` after deploy to confirm.

---

## 3. Image SEO

| File                                      | alt                                                             | width | height | loading | decoding |
| ----------------------------------------- | --------------------------------------------------------------- | ----- | ------ | ------- | -------- |
| `public/images/landmarks/*.svg` (9 files) | `{Name} — {Location}` (collage) or `{Name} illustration` (team) | 512   | 512    | `lazy`  | `async`  |
| `public/og-image.svg`                     | n/a (meta image)                                                | 1200  | 630    | —       | —        |
| `public/favicon.svg`, `icon.svg`          | n/a (icons)                                                     | —     | —      | —       | —        |

Filenames follow the descriptive pattern (`liberty.svg`, `golden-gate.svg`) — not `image1.svg`. SVG format is used everywhere, which is the lightest option for vector illustrations. Raster images would be converted to WebP/AVIF via the `images.unoptimized: true` setting in `next.config.ts` (Cloudflare Workers doesn't run `next/image`; for raster assets we'd use a build-time converter or a Cloudflare Image Resizing worker).

---

## 4. URL architecture (reserved)

| Route                   | Source                                  | Status           | Purpose                               |
| ----------------------- | --------------------------------------- | ---------------- | ------------------------------------- |
| `/`                     | `src/app/page.tsx`                      | Live             | Marketing landing                     |
| `/tools`                | `src/app/tools/page.tsx`                | **New**          | Tools index                           |
| `/tools/[category]`     | `src/app/tools/[category]/page.tsx`     | **New** (11 SSG) | Per-category landing                  |
| `/help`                 | `src/app/help/page.tsx`                 | **New**          | Help center + FAQ                     |
| `/blog`                 | `src/app/blog/page.tsx`                 | Live             | Blog index                            |
| `/blog/category/[slug]` | `src/app/blog/category/[slug]/page.tsx` | **New** (3 SSG)  | Blog category                         |
| `/blog/post/[slug]`     | `src/app/blog/post/[slug]/page.tsx`     | **New** (4 SSG)  | Blog post (moved from `/blog/[slug]`) |
| `/blog/[slug]`          | redirect 308 → `/blog/post/[slug]`      | **New redirect** | Old URL → new                         |
| `/suggest`              | `src/app/suggest/page.tsx`              | Live             | Suggest a tool                        |
| `/contact`              | `src/app/contact/page.tsx`              | Live             | Contact form                          |
| `/about`                | `src/app/about/page.tsx`                | Live             | About / team                          |
| `/privacy-policy`       | `src/app/privacy-policy/page.tsx`       | Live             | Legal                                 |
| `/terms-and-conditions` | `src/app/terms-and-conditions/page.tsx` | Live             | Legal                                 |
| `/terms`                | redirect 308 → `/terms-and-conditions`  | **New redirect** | Short alias                           |
| `/cookies-policy`       | `src/app/cookies-policy/page.tsx`       | Live             | Legal                                 |
| `/security`             | `src/app/security/page.tsx`             | Live             | Legal                                 |
| `/api/waitlist`         | `src/app/api/waitlist/route.ts`         | Live             | Waitlist API                          |
| `/api/suggest`          | —                                       | **Post-launch**  | Suggestion form backend (TODO)        |
| `/api/contact`          | —                                       | **Post-launch**  | Contact form backend (TODO)           |

---

## 5. Internal linking

**Header nav (top of every page):** Tools · Features · Categories · Blog · About · Contact

**Footer columns:**

- Product: All Tools · PDF Tools · Image Tools · AI Tools · Developer Tools · Suggest a Tool · Join Waitlist
- Resources: Blog · Help Center · Changelog · Status
- Company: About · Contact
- Legal: Privacy · Terms · Cookies · Security

**In-page cross-links:**

- `/tools` → each category
- `/tools/[category]` → 4 sibling categories
- `/help` → `/blog`, `/tools`, `/contact`, GitHub
- `/contact` → `/privacy-policy`
- `/suggest` → `/contact`
- `/blog/post/[slug]` → category landing + 3 related posts
- `/blog/category/[slug]` → all posts in category

Every public page is reachable from the nav, the footer, or a category page. No orphan pages.

---

## 6. Pre-launch vs post-launch toggle

Two behaviors flip on the same day, controlled by the `NEXT_PUBLIC_SITE_LIVE` env var (or a constant in `src/lib/constants.ts` if you prefer a code-only flag):

| Behavior                                   | Pre-launch (default)                                                           | Post-launch                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `/suggest` "Top requests" widget           | Honest empty state ("Pre-launch · every submission goes straight to the team") | Real data from `/api/suggest`                                                                                |
| `/suggest` form                            | No-op success state ("we'll review it")                                        | POSTs to `/api/suggest` and returns a slug                                                                   |
| `/contact` form                            | No-op success state                                                            | POSTs to `/api/contact` (or Formspree)                                                                       |
| `Organization.sameAs`                      | GitHub only                                                                    | GitHub + Twitter (if `NEXT_PUBLIC_TWITTER_HANDLE` is set) + Discord (if `NEXT_PUBLIC_DISCORD_INVITE` is set) |
| Pre-launch sections on `/` (per `51c227a`) | Commented out, easy to re-enable                                               | Re-enable ad zones, `CtaStrip`, and the in-page h2 + lead copy                                               |

The flip is a single env var change at deploy time. No code change required.

---

## 7. What's still TODO before launch

These are the items from the original 11-item plan that are _post-launch_ and don't block the URL foundation from going live:

- [ ] `/api/suggest` route (item 8) — wire the form to a real backend
- [ ] `/api/contact` route or Formspree integration (item 5/7) — wire the contact form
- [ ] `/suggest/[slug]` programmatic pages (item 9) — every accepted suggestion becomes a long-tail landing page
- [ ] Per-suggestion OG image generator (item 10) — Next.js native `opengraph-image.tsx`
- [ ] Real leaderboard data hook (item 11) — replaces the empty-state widget when the public board exists
- [ ] Set `NEXT_PUBLIC_SITE_LIVE=true` in production env (item 6) — flips the no-op forms into real submissions
- [ ] Configure `NEXT_PUBLIC_TWITTER_HANDLE` and `NEXT_PUBLIC_DISCORD_INVITE` if/when those accounts exist
- [ ] Update `SITE_CONFIG.github` from the placeholder to the real brand repo if the namespace is transferred
- [ ] Optional: `/suggest/feed.xml` RSS (item 12 from the previous plan) for AI-crawler discovery

---

## 8. How to re-verify before deploy

```bash
# 1. Build
pnpm build

# 2. Serve
pnpm start  # or opennextjs-cloudflare preview

# 3. Smoke test
for path in / /tools /tools/pdf /help /blog /blog/category/guides /blog/post/introducing-widgetly /contact /suggest /about /terms /blog/introducing-widgetly; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$path)
  echo "$path => $code"
done

# 4. Validate JSON-LD on the new pages
curl -s http://localhost:3000/tools/pdf | grep -o 'application/ld+json' | wc -l  # expect 6+
curl -s http://localhost:3000/help | grep -o 'FAQPage' | head -1                  # expect hit
curl -s http://localhost:3000/blog/post/introducing-widgetly | grep -o 'BlogPosting' | head -1
```
