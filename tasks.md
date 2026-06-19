# Tasks — `chore/post-deploy-verification`

Active TODO checklist for this branch. Tracks testing, follow-up
fixes, and outstanding work that's actively in progress or
recently completed.

**How to use this file**

- Mark a task done by changing `[ ]` to `[x]`.
- Add new tasks at the bottom of the matching section.
- When a task is deferred (waiting on research, blocked on a
  decision, etc.), move it to [`future-tasks.md`](./future-tasks.md)
  with a one-line reason. Don't let it rot here.
- After every deploy, verify the live site matches the local
  expectations and update this file accordingly.
- This file is committed to the branch so the full session
  history is preserved in git. The companion `future-tasks.md`
  is the rolling backlog.

---

## 🔄 In Progress

Things actively being worked on or tested right now.

- [ ] **Verify 1102 fix is live.** After deploy of `18302ce`,
      watch Cloudflare logs / observe live traffic for any
      Error 1102 returns on home page. If 0 occurrences over
      24h, mark done.
- [ ] **Confirm sitemap uses `widgetly.tech` in `<loc>` URLs.**
      `curl https://widgetly.tech/en/sitemap.xml | grep '<loc>'`
      — every URL must be on the canonical domain.
- [ ] **Test per-tool pages across all 11 categories** by clicking
      through the mega menu. Watch for: rendering errors, missing
      icons, broken breadcrumb, wrong "Other X" rail.
- [ ] **Test mobile responsiveness** on a tool page at 360px and
      768px viewports. The colored icon tile hero + related-tools
      grid are the most likely to break at narrow widths.

## 📋 Pending — Manual / Out-of-band

Things only the user can do (they involve external accounts,
paid services, or human judgment).

- [ ] **Register `widgetly.tech` in Google Search Console**
      (https://search.google.com/search-console/welcome → URL
      prefix → `https://widgetly.tech`). Add `NEXT_PUBLIC_GOOGLE_VERIFICATION`
      to `.env.local` and run `pnpm setup:secrets`. Submit
      `/en/sitemap.xml`.
- [ ] **Register in Bing Webmaster Tools**
      (https://www.bing.com/webmasters). Add `NEXT_PUBLIC_BING_VERIFICATION`
      and submit sitemap.
- [ ] **Generate an IndexNow key** at https://www.indexnow.org/key,
      save as `public/<key>.txt`. Submit the 327 tool URLs after
      every deploy (or wire it into `.github/workflows/deploy.yml`
      to auto-submit on success).
- [ ] **Set up Plausible analytics** (privacy-friendly, no cookie
      banner). Add `<script defer data-domain="widgetly.tech"
src="https://plausible.io/js/script.js" />` to
      `src/app/[locale]/layout.tsx`. ~$9/mo after 30-day trial.
- [ ] **Submit Widgetly to 5+ directories** for initial backlinks:
      Product Hunt, BetaList, Indie Hackers, AlternativeTo,
      There's An AI For That, AI Tool Hub, Crunchbase.
- [ ] **Hand-write 300+ words of unique body copy for the top 10
      tools** (most-searched). Currently the tool pages use generic
      templates — Google may flag them as thin content. Priority
      tools: Merge PDF, Compress PDF, Resize Image, Compress Image,
      JSON Formatter, Regex Tester, PDF to Word, Word to PDF,
      Image to PDF, Merge JPG.
- [ ] **Generate dynamic OG images per tool** via
      `opengraph-image.tsx` per tool page showing its colored
      icon + name. Currently every page uses the site default.
- [ ] **Verify sitemap in Google Search Console** after
      registration. Check "Discovered pages" count grows over
      the first 7-14 days post-submit.
- [ ] **Run Lighthouse + PageSpeed Insights** on the tool page
      and home page. Target Performance ≥ 90, LCP < 2.5s.

## ✅ Completed — This session

- [x] **Migrate persistence from Supabase to Cloudflare D1.**
      Schema, query helpers, routes, scripts all in place.
      Commits `7c188e5`+ on the prior branch.
- [x] **Add per-tool landing pages** at `/tools/[category]/[tool]`
      with Coming Soon hero + email signup CTA. 327 pages
      prerendered (109 tools × 3 locales). Commit `dbd1470`.
- [x] **Mega menu with colored icon tiles** matching the
      iLovePDF mega-menu pattern. Click-to-toggle, accent colors
      per action type, hover dropdown. Commits `2723064`,
      `1040ce8`, `056e394`, `3d9e88b`.
- [x] **Replace breadcrumb band with global tools banner.**
      Lighter, themed, click-to-toggle dropdown with sub-tool
      icons. Commit `3736105`.
- [x] **Tighten page gaps to ~24px** above and below breadcrumb
      and between sections. Commit `e738fb9`.
- [x] **Fix canonical domain.** `SITE_CONFIG.url` was
      `widgetly.app` (legacy); changed to `widgetly.tech`.
      Fixes sitemap, OG, Twitter cards, JSON-LD `url` fields.
      Commit `1add39c`.
- [x] **Scope JSON-LD per page.** Moved `FAQPage` (only valid
      where FAQ is visible) and `SoftwareApplication` (only
      describes the platform) from the root layout to the home
      page. Tool pages shed ~2.3KB of redundant schema.
      Commit `1add39c`.
- [x] **DOX documentation framework.** Root `AGENTS.md` +
      5 child AGENTS.md (seo, secrets, database, operations,
      api) following DOX section order. Plus DOX read-before-edit
      contract. Commits `9f05e83`, `a18bbfd`.
- [x] **Agent roles + skill-loading protocol.** 6 specialized
      roles defined in root AGENTS.md with explicit skill loadouts
      and a logging format (`[AGENT LOAD]` / `[AGENT CLOSE]`)
      that every reply must use. Commits `bdfcb44`.
- [x] **Fix Cloudflare Error 1102.** Removed `force-dynamic`
      from home page and removed `headers()` call from layout.
      New `/api/region` endpoint reads `cf-ipcountry` server-side
      (edge-cached). ConsentProvider refines region client-side.
      Home page now prerendered (`●` instead of `ƒ`). 440 routes
      in prerender manifest (was 341). Commit `18302ce`.
- [x] **Document the 1102 fix.** Added "Cloudflare Error 1102"
      troubleshooting entry to `docs/operations/AGENTS.md` so
      the next agent doesn't burn 30 minutes rediscovering it.
      Commit `cc30992`.

---

## 🔐 Security follow-through (overdue)

These are PAST-DUE actions the user has not yet completed. Do not
procrastinate on these — every burned PAT is in a permanent
chat transcript.

- [ ] **Revoke ALL GitHub PATs** that appeared in chat during this
      session. At least 6 tokens were burned (see chat history);
      GitHub's secret-scanner will surface each one in the repo's
      "Security" tab as a detected leak. Go to
      https://github.com/settings/tokens → revoke every active token
      that appears in the leak list. **Do this BEFORE generating
      fresh tokens** so an attacker with a leaked value can't race
      you.
- [ ] **Generate fresh PATs** with `repo` + `workflow` scopes,
      short expiration (30 days).
- [ ] **Store fresh PATs via the platform's secret UI**, NEVER
      by pasting in chat. The `secret` CLI / web UI is the
      correct path.
- [ ] **Update `GITHUB_TOKEN` in the sandbox secret store** with
      the new PAT (sandbox-side: `secret update --name=GITHUB_TOKEN
--value=...`).
- [ ] **Rotate `CLOUDFLARE_API_TOKEN`** — same procedure.
      Required scope: `D1:Edit`, `Workers Scripts:Edit`,
      `Account Settings:Read`.
- [ ] **Audit `GEMINI_CRED`** in the sandbox secret store. It was
      flagged in an earlier session as "auth model TBD" — confirm
      intended use before relying on it.

---

_Last updated: 2026-06-17. Refresh after each deploy._
