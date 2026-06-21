/**
 * Application-wide constants for Widgetly.
 * Centralised here so copy, links, and config can be edited in one place.
 */

export const SITE_CONFIG = {
  name: "Widgetly",
  shortName: "Widgetly",
  tagline: "Everything You Need. Nothing You Don't.",
  description:
    "Widgetly is the all-in-one AI tools platform: 500+ free online tools, calculators, converters, generators, PDF editors, and AI assistants — all in one fast, private, mobile-first platform.",
  longDescription:
    "Widgetly brings together hundreds of powerful tools, calculators, generators, converters, PDF utilities, and AI assistants into a single intelligent platform. Built for students, teachers, professionals, creators, developers, marketers, and businesses, Widgetly helps you work better and faster — for free.",
  url: "https://widgetly.tech",
  ogImage: "/og-image.svg",
  locale: "en_US",
  twitterHandle: "@widgetlyapp",
  /**
   * Social profile handles — used by `Organization.sameAs` in
   * `seo.ts`. Only the `github` URL is a hard default (it doubles
   * as the source-of-truth for the project). Twitter and Discord
   * are opt-in via env so the schema graph never lies about a
   * profile that doesn't exist yet. Set `NEXT_PUBLIC_TWITTER_HANDLE`
   * and `NEXT_PUBLIC_DISCORD_INVITE` at deploy time to enable them.
   */
  github: "https://github.com/widgetly/widgetly",
  twitter: (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_TWITTER_HANDLE) || undefined,
  discord: (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DISCORD_INVITE) || undefined,
  email: "hello@widgetly.tech",
  keywords: [
    "AI tools",
    "online tools",
    "free online tools",
    "calculators",
    "converters",
    "generators",
    "PDF tools",
    "SEO tools",
    "developer tools",
    "business tools",
    "education tools",
    "productivity tools",
    "AI assistant",
    "all in one tools platform",
    "best online tools 2025",
    "AI powered tools",
    "mobile tools",
    "free calculators",
    "PDF editor online",
    "image converter",
    "text tools",
  ],
} as const;

export const NAV_LINKS = [
  { label: "Tools", href: "/tools" },
  { label: "Features", href: "/#features" },
  { label: "Categories", href: "/#categories" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * Footer link groups. `labelKey` is the key under `footer.links.*` in
 * the messages bundle (e.g. `allTools`, `pdfTools`); the actual label
 * text is resolved at render time via `useTranslations("footer")`.
 * `icon` is only set for the `social` group (icon-only external links).
 */
export const FOOTER_LINKS = {
  tools: [
    { labelKey: "pdfTools", href: "/tools/pdf" },
    { labelKey: "imageEditor", href: "/tools/image" },
    { labelKey: "seoSuite", href: "/tools/seo" },
    { labelKey: "developer", href: "/tools/developer" },
    { labelKey: "aiTools", href: "/tools/ai" },
    { labelKey: "videoTools", href: "/tools/video" },
  ],
  company: [
    { labelKey: "about", href: "/about" },
    { labelKey: "blog", href: "/blog" },
    { labelKey: "roadmap", href: "#" },
    { labelKey: "suggest", href: "/suggest" },
    { labelKey: "careers", href: "#" },
  ],
  legal: [
    { labelKey: "privacy", href: "/privacy-policy" },
    { labelKey: "terms", href: "/terms-and-conditions" },
    { labelKey: "cookies", href: "/cookies-policy" },
    { labelKey: "security", href: "/security" },
    { labelKey: "dpa", href: "/dpa" },
  ],
  bottom: [
    { labelKey: "status", href: "#" },
    { labelKey: "contact", href: "/contact" },
    { labelKey: "feedback", href: "#" },
  ],
  social: [
    { labelKey: "twitter", href: "https://twitter.com/widgetly", icon: "twitter" },
    { labelKey: "github", href: "https://github.com/widgetly", icon: "github" },
    { labelKey: "discord", href: "https://discord.gg/widgetly", icon: "discord" },
  ],
} as const;

export const HERO_SEARCH_PLACEHOLDERS = [
  "Convert PDF to Word",
  "Generate Lesson Plan",
  "Mortgage Calculator",
  "AI Resume Builder",
  "Word Unscrambler",
  "JSON Formatter",
  "Color Palette Generator",
  "QR Code Generator",
] as const;

/**
 * Launch countdown — set to ~6 weeks out. Update this when launch shifts.
 */
export const LAUNCH_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 42).toISOString();

export type Feature = {
  icon: string;
  /**
   * Key under `home.features.items.*` in the messages bundle.
   * The actual title/description are resolved at render time via
   * `useTranslations("home.features")(item.id + ".title")`.
   */
  id: "aiSearch" | "toolsCount" | "fast" | "cloud" | "mobile" | "privacy";
  accent: "primary" | "secondary" | "accent";
};

export const FEATURES: readonly Feature[] = [
  { icon: "Sparkles", id: "aiSearch", accent: "primary" },
  { icon: "LayoutGrid", id: "toolsCount", accent: "secondary" },
  { icon: "Zap", id: "fast", accent: "accent" },
  { icon: "Cloud", id: "cloud", accent: "primary" },
  { icon: "Smartphone", id: "mobile", accent: "secondary" },
  { icon: "ShieldCheck", id: "privacy", accent: "accent" },
] as const;

export type Category = {
  /** Key segment under `categories.items.*` in the messages bundle. */
  slug: string;
  /** Long-form marketing copy, used on the per-category page. */
  longDescription: string;
  /** Future tool count for the category, used in the card. */
  count: number;
  icon: string;
  href: string;
  accent: "primary" | "secondary" | "accent";
};

export const CATEGORIES: readonly Category[] = [
  {
    slug: "pdf",
    longDescription:
      "Free online PDF tools: merge, split, compress, convert to Word/Excel/JPG/PNG, edit, sign, fill forms, request e-signatures, OCR, protect. No upload limits, no watermarks, runs in your browser.",
    count: 38,
    icon: "FileText",
    href: "/tools/pdf",
    accent: "primary",
  },
  {
    slug: "image",
    longDescription:
      "Online image editor: resize, crop, compress, convert between JPG, PNG, WebP, SVG, AVIF. Background remover, watermark, filters, and batch processing.",
    count: 12,
    icon: "Image",
    href: "/tools/image",
    accent: "secondary",
  },
  {
    slug: "video",
    longDescription:
      "Browser-based video tools: compress, trim, cut, merge, transcribe audio to text, generate subtitles, convert to MP4, WebM, GIF. No software to install.",
    count: 10,
    icon: "Video",
    href: "/tools/video",
    accent: "accent",
  },
  {
    slug: "ai",
    longDescription:
      "Free AI tools for writing, summarizing, rewriting, translating, generating images, building resumes, and answering questions. Powered by the latest LLMs.",
    count: 10,
    icon: "Sparkles",
    href: "/tools/ai",
    accent: "primary",
  },
  {
    slug: "calculators",
    longDescription:
      "Hundreds of free online calculators: mortgage, loan, BMI, calorie, tip, percentage, age, GPA, grade, scientific, financial, health, and math calculators.",
    count: 7,
    icon: "Calculator",
    href: "/tools/calculators",
    accent: "secondary",
  },
  {
    slug: "converters",
    longDescription:
      "Free unit, currency, and file format converters: length, weight, temperature, area, volume, time, speed, data, color codes, and 150+ currencies with live rates.",
    count: 7,
    icon: "ArrowLeftRight",
    href: "/tools/converters",
    accent: "accent",
  },
  {
    slug: "seo",
    longDescription:
      "Free SEO tools: meta tag generator, keyword density checker, sitemap generator, robots.txt tester, SERP preview, backlink checker, page speed insights.",
    count: 7,
    icon: "Search",
    href: "/tools/seo",
    accent: "primary",
  },
  {
    slug: "education",
    longDescription:
      "Tools for teachers and students: lesson plan generator, quiz maker, flashcards, study timer, GPA calculator, citation generator, math solver, writing prompts.",
    count: 7,
    icon: "GraduationCap",
    href: "/tools/education",
    accent: "secondary",
  },
  {
    slug: "developer",
    longDescription:
      "Free developer utilities: JSON formatter and validator, regex tester, Base64 encoder, URL encoder, JWT decoder, CSS minifier, diff checker, hash generator.",
    count: 7,
    icon: "Code2",
    href: "/tools/developer",
    accent: "accent",
  },
  {
    slug: "business",
    longDescription:
      "Business productivity tools: invoice generator, contract templates, proposal builder, NDA generator, business plan templates, SWOT analysis, OKR tracker.",
    count: 7,
    icon: "Briefcase",
    href: "/tools/business",
    accent: "primary",
  },
  {
    slug: "writing",
    longDescription:
      "Free writing tools: word counter, character counter, grammar checker, paraphraser, tone rewriter, headline analyzer, readability scorer, lorem ipsum generator.",
    count: 7,
    icon: "PenLine",
    href: "/tools/writing",
    accent: "accent",
  },
] as const;

export const STATS = {
  toolsPlanned: "500+",
  categories: "50+",
  freeTools: "100%",
  uptimeTarget: "99.9%",
} as const;

/**
 * FAQ entries surfaced on the landing page and emitted as FAQPage JSON-LD.
 */
export const FAQS = [
  {
    question: "What is Widgetly?",
    answer:
      "Widgetly is an all-in-one AI tools platform that brings together 500+ free online tools, calculators, converters, generators, PDF editors, and AI assistants in a single, fast, privacy-first interface. Built for students, teachers, professionals, creators, developers, and businesses.",
  },
  {
    question: "Is Widgetly free to use?",
    answer:
      "Yes. Widgetly is 100% free during launch. Every tool on the platform is free to use with no hidden fees, no watermarks, and no sign-up required for most tools. Optional premium tiers may be added later for power users and teams.",
  },
  {
    question: "When does Widgetly launch?",
    answer:
      "Widgetly is launching soon. Join the waitlist to get early access, launch updates, sneak peeks, and a founders' discount when we go live.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "Most Widgetly tools work without an account. A free optional account unlocks cloud sync, tool history, saved preferences, and cross-device access to your tools and data.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. Widgetly is privacy-first by design. Files are processed in your browser whenever possible, sensitive data is end-to-end encrypted, and we never sell your information to third parties.",
  },
  {
    question: "Can I suggest a tool to be added?",
    answer:
      "Absolutely. We build tools based on user requests. Use the 'Suggest a Tool' link to tell us what you need and we will prioritize the most-requested tools for our launch roadmap.",
  },
  {
    question: "Does Widgetly work on mobile devices?",
    answer:
      "Yes. Widgetly is built mobile-first. Every tool is fully responsive and tested on phones, tablets, and desktops — with fast load times and touch-friendly interfaces on every screen size.",
  },
  {
    question: "How is Widgetly different from other tools platforms?",
    answer:
      "Widgetly combines AI search, 500+ curated tools, a privacy-first architecture, edge-deployed performance, and a single unified interface. Instead of bookmarking dozens of separate websites, you get everything in one fast, free platform.",
  },
] as const;
