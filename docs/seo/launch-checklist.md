# SEO & Growth Launch Checklist

Everything below is **off-code** — actions for you to take in browser dashboards,
not for the repo. Ticked items are either already wired up in the codebase or
done during the work covered by the summary above.

> **Don't skim this.** Each item is high-leverage. The first 6 weeks of a
> tool site determine whether Google indexes you as a real product or
> buries you under iLovePDF / Smallpdf / Adobe. Do these in order.

---

## 🟢 Already done (in this codebase)

- [x] Per-locale sitemaps (`/sitemap.xml`, `/sitemap-en.xml`, etc.)
- [x] hreflang across en/es/fr with `x-default` for the root
- [x] Canonical URLs on every page
- [x] OG + Twitter Card metadata (verified on /en, /en/tools, tool pages)
- [x] JSON-LD structured data on tool pages (SoftwareApplication schema)
- [x] Robots.txt with sitemap pointer, AI bot rules (GPTBot, Claude, CCBot)
- [x] Web App Manifest + favicon set
- [x] Core Web Vitals instrumentation (LCP/CLS/INP via `web-vitals` package)
- [x] Edge cache (CF) + KV cache (OpenNext) for HTML — see `docs/operations/cache-test.md`
- [x] `verify-counts.sh` in DOD gate so tool counts never drift from reality

---

## 🟡 High priority — first 7 days

### 1. Google Search Console

- [ ] Go to https://search.google.com/search-console
- [ ] Add property for `https://widgetly.tech` (Domain method, not URL prefix)
- [ ] Verify via DNS TXT record on your registrar (Cloudflare Registrar works)
- [ ] **Submit sitemaps**: paste all three (`/sitemap-en.xml`, `/sitemap-es.xml`, `/sitemap-fr.xml`) into Sitemaps → Add sitemap
- [ ] Enable "Indexing" → "Pages" report. After 3-5 days, check Coverage
- [ ] Enable "Enhancements" → Core Web Vitals (mobile + desktop)
- [ ] **Wait 7 days** for first crawl, then re-check

### 2. Bing Webmaster Tools

- [ ] Go to https://www.bing.com/webmasters
- [ ] Add site, verify via DNS CNAME
- [ ] Submit sitemaps
- [ ] Enable IndexNow (instant indexing API) — push URL whenever a new tool ships
  - Endpoint: `https://api.indexnow.org/indexnow?url={url}&key={your-key}`
  - Key: generate at https://www.bing.com/indexnow

### 3. Analytics

- [ ] Pick ONE: Plausible (paid, privacy-first) or Google Analytics 4 (free, ad-tracked)
- [ ] Add tracking script to `src/app/layout.tsx`
- [ ] For Plausible, set up goals: `tool_used`, `pdf_uploaded`, `result_downloaded`
- [ ] Create a custom report: "Tool page → exit" funnel to see which tools get abandoned

### 4. Google Business Profile (if applicable)

- [ ] If widgetly has a physical HQ or office, create a GBP listing
- [ ] If it's purely remote, skip this

### 5. Set up `mailto:` + business contact

- [ ] Make sure hello@widgetly.tech, support@widgetly.tech, privacy@widgetly.tech all work
- [ ] Add them to `/contact` page
- [ ] Critical for E-E-A-T (Google's "experience, expertise, authority, trust" signal)

---

## 🟡 High priority — first 30 days

### 6. Backlinks (the painful but necessary part)

Google weighs widgetly's ranking heavily on **domain authority** built from
backlinks. With zero backlinks, even the best content won't crack page 1.

Tactics, ordered by ROI:

1. **Product Hunt launch** — biggest single-day traffic spike possible
   - Prepare a 1-min demo video, 4-5 screenshots, founder bio
   - Best launch day = Tuesday or Wednesday, 12:01 AM PST
   - Goal: top 5 of the day. Anything below top 10 is wasted effort
2. **Reddit** — r/SideProject, r/InternetIsBeautiful, r/webdev, r/SEO
   - Post as a user, not as a brand. "I built this" works if you share the journey
   - Don't spam — one good post per sub, max
3. **Hacker News (Show HN)** — same format, technical angle
   - Lead with a technical story (e.g., "How I migrated 50K static pages to
     OpenNext + Cloudflare Workers KV")
4. **Indie Hackers** — share revenue, lessons, technical decisions
5. **Direct outreach** to "best of" listicle owners:
   - Search `"best free [pdf tool]" inurl:list` for each top tool
   - Email the author: "Hey, I built widgetly.tech, would you consider adding it?"
6. **Guest posts** on dev/SEO blogs (Dev.to, freeCodeCamp, LogRocket, Smashing)
7. **AI search engines** (NEW — important in 2026):
   - Submit to https://chatgpt.com/indexnow (no public endpoint, but mention
     in forums — Google has hinted at AI-Index)
   - Make sure robots.txt allows GPTBot, ClaudeBot, CCBot (already done)
   - Add `<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">`

### 7. Set up IndexNow for instant indexing

```bash
# One-time: get API key
curl https://api.indexnow.org/indexnow?url=https://widgetly.tech&key=YOUR_KEY

# Per new tool:
curl "https://api.indexnow.org/indexnow?url=https://widgetly.tech/en/tools/pdf/ocr-pdf&key=YOUR_KEY"

# Or in JS (Next.js):
const submit = async (url: string) => {
  await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${process.env.INDEXNOW_KEY}`);
};
// Call submit() in your publish-to-prod hook
```

### 8. Submit to tool directories (one-time, 30 min total)

These give **dofollow** backlinks and surface widgetly in niche searches:

- [ ] https://www.producthunt.com (as part of #6)
- [ ] https://alternativeto.net (categories: PDF tools, Image tools, AI tools)
- [ ] https://www.capterra.com/ (free tier)
- [ ] https://www.g2.com/ (free tier)
- [ ] https://github.com/topics (use the "tools" topic on the widgetly repo)
- [ ] https://www.toolpilot.ai/ (new, AI-tool-focused)
- [ ] https://theresanaiforthat.com/ (if you have AI tools)
- [ ] https://www.futurepedia.io/ (same)
- [ ] https://www.saashub.com/
- [ ] https://www.launchingnext.com/

### 9. Create YouTube tutorials (slow burn, huge ROI)

For each top-10 tool, make a 90-second tutorial:

- [ ] "How to merge PDF files online for free" (embed widgetly.tech)
- [ ] "How to compress a PDF without losing quality"
- [ ] "How to remove a PDF password"
- [ ] "How to convert Word to PDF (free, no signup)"
- [ ] etc.

Why: YouTube tutorials rank for "how to" queries, send high-intent traffic,
and act as a trust signal. Plus the embeds give you **youtube.com** backlinks.

### 10. Social profiles (dofollow brand signals)

Create accounts and pin widgetly:

- [ ] https://twitter.com/widgetly (post weekly, share user wins)
- [ ] https://www.linkedin.com/company/widgetly (post monthly product updates)
- [ ] https://www.youtube.com/@widgetly (repurpose the tutorials)
- [ ] https://github.com/widgetly (mirror the repo, link back)
- [ ] https://www.reddit.com/user/widgetly-founder (use sparingly)
- [ ] https://www.crunchbase.com/organization/widgetly (for E-E-A-T)

---

## 🔵 Lower priority — ongoing (post-launch)

### 11. Core Web Vitals monitoring

- [ ] Set up weekly PageSpeed Insights check on top 5 tool pages
  - https://pagespeed.web.dev/
- [ ] Goal: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Check Search Console → Experience → Core Web Vitals after first month
- [ ] If LCP > 2.5s on tool pages, the issue is almost always:
  - Missing `priority` on hero image
  - Render-blocking font (we use next/font already, but verify)
  - Heavy client JS (the AI tools are at risk)

### 12. Structured data validation

- [ ] Google Rich Results Test: https://search.google.com/test/rich-results
  - Test 5 tool pages, look for errors in `SoftwareApplication` schema
- [ ] Schema Markup Validator: https://validator.schema.org/
- [ ] After fixing any issues, submit URL via Search Console → URL Inspection → Request Indexing

### 13. Monitor for crawl errors

- [ ] Search Console → Pages → "Why pages aren't indexed"
- [ ] Common causes to watch for:
  - `Discovered - currently not indexed` → new pages, just wait
  - `Crawled - currently not indexed` → content deemed low-quality (add more text)
  - `Soft 404` → page returns 200 but looks empty (add content)
  - `Blocked by robots.txt` → check the rule (we have `/api/` blocked, that's correct)

### 14. International SEO

- [ ] Verify hreflang with Search Console → International Targeting
- [ ] Make sure each locale has its own sitemap (we do)
- [ ] If you add Portuguese or German later, ship both versions at the same time
      (Google penalizes staggered launches)

### 15. Negative SEO defense

- [ ] Set up Google Alerts for "widgetly.tech" and "widgetly app"
- [ ] Monitor backlink profile monthly (free: https://www.openlinkprofiler.org/)
- [ ] Disavow any spammy backlinks via Search Console → Disavow Links

---

## 📊 What success looks like (90-day targets)

| Metric                  | Day 30 | Day 60 | Day 90 |
| ----------------------- | ------ | ------ | ------ |
| Indexed pages (GSC)     | 150+   | 400+   | 600+   |
| Organic clicks/month    | 50     | 500    | 2,000  |
| Domain Rating (Ahrefs)  | 5      | 15     | 25+    |
| Backlinks               | 10     | 50     | 150+   |
| Top-10 ranking keywords | 5      | 30     | 100+   |
| LCP p75 (mobile)        | < 3.0s | < 2.5s | < 2.2s |

If you're below the Day 30 numbers, the most likely culprit is **backlinks** —
go back to step #6.

---

## 🆘 When to call for help

- After 60 days with < 100 indexed pages → sitemap/robots issue, check Search Console
- After 60 days with < 50 organic clicks/day → content quality issue, double the
  text on every tool page
- After 90 days with DR < 10 → backlinks are the bottleneck, not code
- Manual action in Search Console → fix immediately, file reconsideration request

For the technical side (sitemap, robots, structured data, performance), all
the in-code work is done. The bottleneck now is content depth + backlinks.
