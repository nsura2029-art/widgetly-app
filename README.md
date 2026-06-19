# Widgetly

> **One Search. Endless Possibilities.**
> An AI-powered utility platform with 500+ tools — calculators, converters, generators, PDF tools, AI assistants, and more.

A modern, premium Coming Soon landing page for [Widgetly](https://widgetly.tech), built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **ShadCN UI**, and **Framer Motion**. Designed for **Cloudflare Pages** deployment.

---

## ✨ Highlights

- 🎨 **Premium design language** — inspired by Linear, Stripe, Vercel, Framer, Perplexity, and Notion
- ⚡ **60fps animations** — Framer Motion + GPU-friendly CSS transforms
- ♿ **WCAG AA accessible** — keyboard nav, focus rings, screen reader support, reduced-motion
- 📱 **Mobile-first** — responsive down to 360px
- 🚀 **Edge-deployed** — static export ready for Cloudflare Pages
- 🔍 **SEO-ready** — dynamic metadata, OpenGraph, Twitter cards, sitemap, robots.txt
- 🛡 **GDPR / CCPA cookie consent** — banner, preferences modal, region-aware defaults, version-locked re-prompt, see [docs/CONSENT.md](./docs/CONSENT.md)
- 🔒 **Zero third-party trackers** — no analytics, no ads, no pageview events; consent store stores only the user's preference in `localStorage`
- 🛠 **Type-safe** — full TypeScript strict mode
- 🎯 **Zero-config Tailwind** — ShadCN-style tokens baked into `tailwind.config.ts`

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run the dev server
pnpm dev          # → http://localhost:3000

# 3. Type-check, lint, and format
pnpm type-check
pnpm lint
pnpm format

# 4. Production build (static export)
pnpm build        # outputs to .vercel/output/static
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

---

## Suggest a Tool Feature

The public suggestion board lives at `/suggest`, with submission at `/suggest/new` and
individual suggestion pages at `/suggest/[id]` where `[id]` can be a numeric D1 id or a
shareable slug.

Local setup:

```bash
corepack pnpm@9.15.9 install
corepack pnpm@9.15.9 db:migrate:local
corepack pnpm@9.15.9 dev
```

Production rollout:

```bash
corepack pnpm@9.15.9 type-check
corepack pnpm@9.15.9 test
corepack pnpm@9.15.9 exec opennextjs-cloudflare build
corepack pnpm@9.15.9 db:migrate:remote
```

The feature uses Cloudflare D1 tables `suggestions`, `upvotes`, and `email_queue`.
Anonymous upvotes are tracked with a session cookie plus hashed IP, and submissions are
rate-limited to 3 suggestions per email per UTC day.

---

## 📁 Project Structure

```
widgetly/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + SEO + JSON-LD
│   │   ├── page.tsx            # Landing page composition
│   │   ├── sitemap.ts          # Dynamic sitemap
│   │   ├── robots.ts           # robots.txt
│   │   ├── icon.svg            # Favicon (Next.js convention)
│   │   ├── globals.css         # Tailwind + design tokens
│   │   └── api/
│   │       └── waitlist/
│   │           └── route.ts    # Optional edge endpoint
│   │
│   ├── components/
│   │   ├── layout/             # Header, Footer
│   │   ├── landing/            # Hero, Features, Categories, Waitlist, etc.
│   │   ├── shared/             # Logo, FadeIn, Stagger, AnimatedBackground, accent tokens
│   │   └── ui/                 # ShadCN primitives (Button, Card, Input, Badge)
│   │
│   ├── lib/
│   │   ├── constants.ts        # Site config, features, categories, stats
│   │   ├── seo.ts              # Metadata helpers, OG/Twitter, canonical URLs
│   │   ├── utils.ts            # cn(), isValidEmail(), clamp(), etc.
│   │   └── icons.ts            # Icon name → Lucide component map
│   │
│   ├── hooks/
│   │   ├── use-countdown.ts    # SSR-safe countdown timer
│   │   └── use-mounted.ts      # Client-mount guard
│   │
│   └── types/
│       └── index.ts            # Shared TS types
│
├── public/
│   ├── favicon.svg
│   ├── icon.svg
│   ├── og-image.svg
│   ├── robots.txt
│   └── site.webmanifest
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, type-check, build on PR/push
│       └── deploy.yml          # Build & deploy to Cloudflare Pages
│
├── .husky/                     # Git hooks
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── wrangler.toml               # Cloudflare Pages config
└── package.json
```

---

## 🎨 Design System

### Brand Colors

| Token        | Hex       | Usage                   |
| ------------ | --------- | ----------------------- |
| `primary`    | `#5B6CFF` | Main brand, CTAs, links |
| `secondary`  | `#7B61FF` | Mid-tone accents        |
| `accent`     | `#A855F7` | Highlights, AI features |
| `background` | `#FFFFFF` | Page background         |
| `dark`       | `#0F172A` | Footer, dark sections   |
| `border`     | `#E5E7EB` | Card borders, dividers  |
| `text`       | `#111827` | Body text               |
| `muted`      | `#6B7280` | Secondary text          |

All colors are exposed as Tailwind utilities (`bg-primary`, `text-muted`, etc.) and as CSS variables.

### Typography

- **Font**: Inter (variable, self-hosted via `next/font`)
- **Display scale**: `display-2xl` → `display-sm` for headlines
- **Body**: system stack with `text-balance` for wrapping

### Motion

All animations respect `prefers-reduced-motion`. The shared `<FadeIn>` and `<Stagger>` wrappers handle the boilerplate:

```tsx
<FadeIn direction="up" delay={0.2}>
  <h2>This fades in from below</h2>
</FadeIn>

<Stagger>
  <StaggerItem>One</StaggerItem>
  <StaggerItem>Two</StaggerItem>
  <StaggerItem>Three</StaggerItem>
</Stagger>
```

---

## ☁️ Deploying to Cloudflare Pages

### One-time setup

1. **Create a Pages project** at [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → Create → Direct Upload → name it `widgetly`.

2. **Add secrets to GitHub** (Settings → Secrets → Actions):
   - `CLOUDFLARE_API_TOKEN` — [Create here](https://dash.cloudflare.com/profile/api-tokens) with the "Cloudflare Pages: Edit" template.
   - `CLOUDFLARE_ACCOUNT_ID` — Found on the right sidebar of any Cloudflare dashboard page.

3. **(Optional) Add a KV namespace** for persisting waitlist signups:
   ```bash
   wrangler kv:namespace create WAITLIST
   wrangler kv:namespace create WAITLIST --preview
   ```
   Then uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and plug in the IDs.

### Deploy

Push to `main` — the `Deploy to Cloudflare Pages` workflow handles everything.

Or deploy manually:

```bash
pnpm build
wrangler pages deploy .vercel/output/static --project-name widgetly
```

### Cloudflare Web Analytics

Drop the analytics beacon into `src/app/layout.tsx` to get real-user performance metrics (no cookies, GDPR-friendly):

```tsx
<Script
  src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_ANALYTICS_TOKEN}"}`}
/>
```

---

## 🧪 Code Quality

| Tool               | Purpose                | Command                    |
| ------------------ | ---------------------- | -------------------------- |
| **ESLint**         | Lint (Next + TS rules) | `pnpm lint`                |
| **Prettier**       | Formatting             | `pnpm format`              |
| **TypeScript**     | Type-check             | `pnpm type-check`          |
| **Husky**          | Git hooks              | runs on `prepare`          |
| **lint-staged**    | Pre-commit lint/format | runs on staged files       |
| **GitHub Actions** | CI on every PR         | `.github/workflows/ci.yml` |

### Hooks

- **pre-commit**: runs `lint-staged` (format + lint on staged files)
- **pre-push**: runs `tsc --noEmit`

## 📚 Docs

- [API.md](./docs/API.md) — public HTTP endpoints, OpenAPI spec
- [FRONTEND.md](./docs/FRONTEND.md) — frontend architecture
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Cloudflare Pages + Workers deploy
- [CONSENT.md](./docs/CONSENT.md) — cookie consent system, region detection, what we track
- [i18n-translation.md](./docs/i18n-translation.md) — adding a locale or translation
- [LAUNCH_INDEXABILITY.md](./docs/LAUNCH_INDEXABILITY.md) — pre-launch SEO checklist

---

## 🔍 SEO

- **Metadata** built in `src/lib/seo.ts` with sensible defaults from `SITE_CONFIG`
- **OpenGraph** + **Twitter Cards** auto-generated for every page
- **JSON-LD** structured data: `WebSite` (with `SearchAction`) + `Organization` schemas
- **Sitemap** at `/sitemap.xml` via `app/sitemap.ts`
- **robots.txt** at `/robots.txt` via `app/robots.ts`
- **Skip-to-content** link for keyboard users

---

## ♿ Accessibility

- Semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`, `<ol>`)
- ARIA labels on icon-only buttons and decorative elements
- Focus rings on all interactive elements (visible only on `:focus-visible`)
- `prefers-reduced-motion` honored globally
- Color contrast verified to WCAG AA on the brand palette
- Form inputs have associated `<label>`s (sr-only where visual space is tight)

---

## 📊 Performance

- Static export → deploys to Cloudflare's edge (sub-50ms TTFB globally)
- `next/font` self-hosts Inter (no Google Fonts blocking)
- Images set to `unoptimized` for static export (swap if you re-enable SSR)
- Framer Motion uses `transform` + `opacity` only (composited on GPU)
- No client-side state management library — everything is local component state
- Target: **Lighthouse >95** on Performance, Accessibility, Best Practices, SEO

---

## 📝 License

MIT — see [LICENSE](./LICENSE).

---

<p align="center">
  Built with care. Deployed on Cloudflare.
</p>
