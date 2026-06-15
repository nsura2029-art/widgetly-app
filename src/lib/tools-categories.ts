import { SITE_CONFIG } from "./constants";

/**
 * Short-URL slug registry for the `/tools/[category]` route.
 *
 * Why short slugs (`/tools/pdf`) instead of the long ones already in
 * `CATEGORIES` (`/tools/pdf-tools`)? Two reasons:
 *  1. URL economy: shorter URLs rank slightly better for short-tail
 *     queries and look cleaner in shared links.
 *  2. The long slugs are for in-page anchors (the homepage
 *     `#categories` deep links already use them). External routes
 *     can be terser.
 *
 * Each entry also carries the target keyword cluster for the page's
 * metadata — these are the phrases the page is *intended* to rank for.
 * Use them in the page title, H1, intro paragraph, and `keywords`
 * metadata field. The page copy should never be optimized for the
 * list at the expense of readability; it's a relevance signal, not a
 * keyword-stuffing checklist.
 */
export type ToolsCategory = {
  /** Short URL slug, e.g. `pdf`. Used in `/tools/[category]`. */
  slug: string;
  /** Display name shown in nav, page H1, and OG titles. */
  name: string;
  /** One-line pitch used in cards and meta descriptions. */
  pitch: string;
  /** 2-3 sentence landing-page intro. */
  intro: string;
  /** Plural form for the headline — e.g. "PDF tools", "Calculators". */
  headline: string;
  /** Approximate tool count at launch (used in the page card). */
  count: number;
  /** Lucide icon name from `src/lib/icons.ts`. */
  icon: string;
  /** Brand accent key, mirrors `Category.accent` in constants. */
  accent: "primary" | "secondary" | "accent";
  /** Primary and secondary keyword cluster. */
  keywords: {
    primary: string;
    secondary: readonly string[];
  };
  /** Example sub-tools shown on the category page. */
  examples: readonly string[];
};

export const TOOLS_CATEGORIES: readonly ToolsCategory[] = [
  {
    slug: "pdf",
    name: "PDF Tools",
    headline: "Free online PDF tools",
    pitch: "Merge, split, compress, convert, sign, redact — every PDF tool you need in one place.",
    intro:
      "Every PDF tool you'll actually use, in your browser. No upload limits, no watermarks, no sign-up. Merge, split, compress, convert to Word / Excel / JPG, sign, redact, protect — and the rest just works.",
    count: 28,
    icon: "FileText",
    accent: "primary",
    keywords: {
      primary: "pdf tools",
      secondary: [
        "online pdf tools",
        "free pdf tools",
        "merge pdf",
        "split pdf",
        "compress pdf",
        "pdf to word",
        "pdf editor",
      ],
    },
    examples: [
      "Merge PDF",
      "Split PDF",
      "Compress PDF",
      "PDF to Word",
      "PDF to JPG",
      "Sign PDF",
      "Protect PDF",
    ],
  },
  {
    slug: "image",
    name: "Image Tools",
    headline: "Free online image tools",
    pitch: "Resize, crop, convert, optimize, remove backgrounds — image tools that just work.",
    intro:
      "A full image workshop in your browser. Resize and crop for any platform, convert between JPG, PNG, WebP, SVG, and AVIF, remove backgrounds, add watermarks, and batch-process whole folders in seconds.",
    count: 35,
    icon: "Image",
    accent: "secondary",
    keywords: {
      primary: "image tools",
      secondary: [
        "online image tools",
        "free image tools",
        "image converter",
        "image resizer",
        "image compressor",
        "background remover",
        "image editor online",
      ],
    },
    examples: [
      "Resize Image",
      "Compress Image",
      "Convert to WebP",
      "Background Remover",
      "Add Watermark",
      "Crop to Circle",
      "Image to Text (OCR)",
    ],
  },
  {
    slug: "video",
    name: "Video Tools",
    headline: "Free online video tools",
    pitch: "Compress, trim, transcribe, convert, subtitle — all in your browser, no install.",
    intro:
      "Browser-based video tools that don't ship you to a download page. Compress without losing quality, trim and merge clips, transcribe audio to text, auto-generate subtitles, and convert between MP4, WebM, and GIF.",
    count: 18,
    icon: "Video",
    accent: "accent",
    keywords: {
      primary: "video tools",
      secondary: [
        "online video tools",
        "free video tools",
        "video compressor",
        "video trimmer",
        "video to text",
        "video converter",
        "subtitle generator",
      ],
    },
    examples: [
      "Compress Video",
      "Trim Video",
      "Merge Clips",
      "Video to Text",
      "Generate Subtitles",
      "Convert to MP4",
      "Video to GIF",
    ],
  },
  {
    slug: "ai",
    name: "AI Tools",
    headline: "Free AI tools online",
    pitch:
      "Write, summarize, generate, translate, brainstorm — AI tools powered by the latest models.",
    intro:
      "Useful AI tools, not toys. Summarize long documents, draft emails, generate images, rewrite in a different tone, translate to 50+ languages, and answer research questions — all without a ChatGPT account.",
    count: 42,
    icon: "Sparkles",
    accent: "primary",
    keywords: {
      primary: "ai tools",
      secondary: [
        "online ai tools",
        "free ai tools",
        "ai writing tools",
        "ai summarizer",
        "ai image generator",
        "ai assistant",
        "chatgpt alternative",
      ],
    },
    examples: [
      "AI Writer",
      "AI Summarizer",
      "AI Image Generator",
      "AI Translator",
      "AI Resume Builder",
      "AI Tutor",
      "AI Email Reply",
    ],
  },
  {
    slug: "calculators",
    name: "Calculators",
    headline: "Free online calculators",
    pitch: "Finance, math, health, GPA, mortgage, BMI — every calculator you'll actually open.",
    intro:
      "Hundreds of free online calculators for the moments you actually need one. Mortgage payments, loan amortization, BMI, calorie targets, percentage changes, scientific and graphing — all instant, all free.",
    count: 64,
    icon: "Calculator",
    accent: "secondary",
    keywords: {
      primary: "online calculators",
      secondary: [
        "free online calculators",
        "mortgage calculator",
        "loan calculator",
        "BMI calculator",
        "percentage calculator",
        "gpa calculator",
        "scientific calculator",
      ],
    },
    examples: [
      "Mortgage Calculator",
      "Loan Amortization",
      "BMI Calculator",
      "Calorie Counter",
      "Tip Calculator",
      "Percentage Change",
      "Scientific Calculator",
    ],
  },
  {
    slug: "converters",
    name: "Converters",
    headline: "Free online converters",
    pitch:
      "Units, currencies, file formats — convert anything to anything, with live currency rates.",
    intro:
      "Convert anything to anything in your browser. Units of length, weight, temperature, area, volume, time, and data. Currencies with live mid-market rates. File formats between PDF, DOCX, JPG, PNG, MP3, MP4, and 40+ others.",
    count: 51,
    icon: "ArrowLeftRight",
    accent: "accent",
    keywords: {
      primary: "online converters",
      secondary: [
        "free online converters",
        "unit converter",
        "currency converter",
        "file converter",
        "pdf converter",
        "measurement converter",
      ],
    },
    examples: [
      "Unit Converter",
      "Currency Converter",
      "PDF Converter",
      "Audio Converter",
      "Color Code Converter",
      "Time Zone Converter",
      "Base64 Encoder",
    ],
  },
  {
    slug: "seo",
    name: "SEO Tools",
    headline: "Free SEO tools",
    pitch: "Keywords, meta tags, sitemaps, SERP preview, page speed — every SEO check you need.",
    intro:
      "The SEO checks you'd otherwise pay for. Meta tag generator, keyword density analyzer, XML sitemap builder, robots.txt tester, SERP snippet preview, backlink inspector, and a Core Web Vitals audit for any URL.",
    count: 24,
    icon: "Search",
    accent: "primary",
    keywords: {
      primary: "seo tools",
      secondary: [
        "free seo tools",
        "online seo tools",
        "keyword research",
        "meta tag generator",
        "sitemap generator",
        "serp preview",
        "page speed test",
      ],
    },
    examples: [
      "Meta Tag Generator",
      "Keyword Density",
      "XML Sitemap",
      "Robots.txt Tester",
      "SERP Preview",
      "Backlink Checker",
      "Page Speed Audit",
    ],
  },
  {
    slug: "developer",
    name: "Developer Tools",
    headline: "Free online developer tools",
    pitch:
      "Formatters, validators, encoders, regex testers — the utilities you keep alt-tabbing for.",
    intro:
      "The dev utilities you keep reaching for. JSON / YAML / XML formatters and validators, Base64 and URL encoders, regex tester with match highlighting, JWT decoder, diff viewer, and a code-beautifier that handles 30+ languages.",
    count: 32,
    icon: "Code",
    accent: "accent",
    keywords: {
      primary: "developer tools",
      secondary: [
        "free developer tools",
        "online developer tools",
        "json formatter",
        "regex tester",
        "base64 encoder",
        "jwt decoder",
        "code formatter",
      ],
    },
    examples: [
      "JSON Formatter",
      "Regex Tester",
      "Base64 Encoder",
      "JWT Decoder",
      "Diff Viewer",
      "YAML Validator",
      "Code Beautifier",
    ],
  },
  {
    slug: "business",
    name: "Business Tools",
    headline: "Free online business tools",
    pitch:
      "Invoices, contracts, proposals, expense reports — business paperwork, done in your browser.",
    intro:
      "The paperwork tools every small business actually needs. Invoice generator with line items and tax, contract templates, expense reports, simple CRM, and a proposal builder you can send as a link.",
    count: 19,
    icon: "Briefcase",
    accent: "primary",
    keywords: {
      primary: "business tools",
      secondary: [
        "free business tools",
        "online business tools",
        "invoice generator",
        "expense tracker",
        "contract template",
        "proposal builder",
      ],
    },
    examples: [
      "Invoice Generator",
      "Contract Template",
      "Expense Report",
      "Proposal Builder",
      "Business Plan",
      "SWOT Analyzer",
      "Pricing Calculator",
    ],
  },
  {
    slug: "education",
    name: "Education Tools",
    headline: "Free education tools",
    pitch:
      "Flashcards, study planners, citation generators, GPA trackers — study smarter, not longer.",
    intro:
      "Built for students, teachers, and lifelong learners. AI flashcard generator from any text, study schedule planner, citation generator for APA / MLA / Chicago, GPA tracker, and a one-click lesson-plan builder.",
    count: 22,
    icon: "GraduationCap",
    accent: "secondary",
    keywords: {
      primary: "education tools",
      secondary: [
        "free education tools",
        "online education tools",
        "flashcard generator",
        "citation generator",
        "gpa calculator",
        "study planner",
        "lesson plan",
      ],
    },
    examples: [
      "AI Flashcards",
      "Citation Generator",
      "GPA Tracker",
      "Study Planner",
      "Lesson Plan Builder",
      "Word Unscrambler",
      "Math Solver",
    ],
  },
  {
    slug: "writing",
    name: "Writing Tools",
    headline: "Free online writing tools",
    pitch:
      "Word counters, grammar checks, paraphrasers, headline analyzers — write better, faster.",
    intro:
      "The writing desk you keep meaning to build. Real-time word and character counters, grammar and tone checks, paraphraser with 5 styles, headline analyzer for click-through, and a readability scorer that doesn't lie to you.",
    count: 17,
    icon: "PenLine",
    accent: "accent",
    keywords: {
      primary: "writing tools",
      secondary: [
        "free writing tools",
        "online writing tools",
        "word counter",
        "grammar checker",
        "paraphraser",
        "headline analyzer",
        "readability checker",
      ],
    },
    examples: [
      "Word Counter",
      "Grammar Checker",
      "Paraphraser",
      "Headline Analyzer",
      "Readability Score",
      "Tone Rewriter",
      "Lorem Ipsum Generator",
    ],
  },
];

const CATEGORY_BY_SLUG = new Map(TOOLS_CATEGORIES.map((c) => [c.slug, c]));

export function getToolsCategory(slug: string): ToolsCategory | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

export function getAllToolsCategorySlugs(): readonly string[] {
  return TOOLS_CATEGORIES.map((c) => c.slug);
}

/** Per-page keyword list, with primary repeated for emphasis. */
export function getToolsCategoryKeywords(cat: ToolsCategory): readonly string[] {
  return [cat.keywords.primary, ...cat.keywords.secondary];
}

export { SITE_CONFIG };
