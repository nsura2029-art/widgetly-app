/**
 * Seed data for the `/suggest/[slug]` programmatic pages.
 *
 * In production this would be replaced by a real database (Cloudflare
 * D1, Workers KV, or a third-party store). The schema here is the
 * contract the page, sitemap, leaderboard, and OG image all
 * consume. Add a new entry here to ship a new suggestion landing
 * page — no code change to the page itself.
 *
 * Cross-link with the `/tools/[category]` registry by setting
 * `toolsCategorySlug` to one of the slugs in
 * `src/lib/tools-categories.ts`. The page renders a "Related tools
 * in this category" rail automatically.
 */

export type SuggestionStatus = "pending_review" | "in_queue" | "in_development" | "shipped";

export type Suggestion = {
  /** URL slug. Used in /suggest/{slug}. Lowercase letters, digits, hyphens. */
  slug: string;
  /** Display name of the tool. */
  name: string;
  /** 1-2 sentence pitch shown on the card and as the meta description default. */
  pitch: string;
  /** 2-3 sentence description shown in the hero of the suggestion page. */
  description: string;
  /** "Why this tool" section. 1-2 sentences per bullet. */
  reasons: readonly string[];
  /** Free-form category label. Display only. */
  category: string;
  /**
   * Slug of the related `/tools/[category]` page. Used to render
   * the "Related tools in this category" rail. Must be one of the
   * slugs in `src/lib/tools-categories.ts`.
   */
  toolsCategorySlug: string;
  /** Pipeline status. Drives the status timeline UI. */
  status: SuggestionStatus;
  /** Display count. Pre-launch, this is the seed value. */
  voteCount: number;
  /** ISO date the user submitted the idea. */
  submittedAt: string;
  /** ISO date we accepted it into the build queue. */
  acceptedAt: string;
  /** ISO date we moved it into development. */
  developmentStartedAt?: string;
  /** ISO date we shipped. */
  shippedAt?: string;
  /** ISO date we expect to ship (only set when in_development). */
  estimatedShipDate?: string;
  /** Target keywords for SEO. */
  keywords: readonly string[];
  /** Short label for the OG image. Defaults to name. */
  ogTagline?: string;
};

export const SUGGESTIONS: readonly Suggestion[] = [
  {
    slug: "pdf-summarizer",
    name: "PDF Summarizer",
    pitch: "Drop in a PDF, get a 5-bullet summary. Built for long reports and contracts.",
    description:
      "An AI-powered PDF summarizer that turns 50-page documents into a tight 5-bullet summary you can read in 60 seconds. Highlights the key findings, the action items, and the contradictions with the source material.",
    reasons: [
      "Most PDF readers force you to scroll. A summary front-loads the value.",
      "The AI tools we have today can extract the gist reliably from well-structured documents.",
      "It's a high-frequency task: anyone who reads contracts, research papers, or board decks does this daily.",
    ],
    category: "PDF",
    toolsCategorySlug: "pdf",
    status: "in_development",
    voteCount: 142,
    submittedAt: "2026-01-22",
    acceptedAt: "2026-01-29",
    developmentStartedAt: "2026-02-12",
    estimatedShipDate: "2026-04-15",
    keywords: ["pdf summarizer", "ai pdf summary", "summarize pdf", "pdf ai", "document summary"],
    ogTagline: "Long PDFs, 5-bullet summaries.",
  },
  {
    slug: "ai-flashcard-generator",
    name: "AI Flashcard Generator",
    pitch: "Drop in any text, get spaced-repetition flashcards ready to study.",
    description:
      "Anki-compatible flashcards generated from any text — a chapter, a PDF, a YouTube transcript. Spaced repetition intervals are calculated using the FSRS algorithm, so you retain more in less time.",
    reasons: [
      "Manual flashcard creation is the #1 reason people abandon Anki.",
      "Spaced repetition is the most evidence-backed study technique we have.",
      "FSRS is the new default in Anki 24+ and the algorithm is open.",
    ],
    category: "Education",
    toolsCategorySlug: "education",
    status: "in_queue",
    voteCount: 98,
    submittedAt: "2026-01-25",
    acceptedAt: "2026-02-05",
    keywords: ["ai flashcards", "anki", "spaced repetition", "study tool", "fsrs"],
    ogTagline: "Text in, flashcards out.",
  },
  {
    slug: "markdown-to-pdf",
    name: "Markdown → PDF",
    pitch:
      "Convert a markdown file (or paste) into a styled PDF. Custom fonts, print CSS, headers.",
    description:
      "Drop in a markdown file and get a print-ready PDF that respects your custom fonts, syntax highlighting, and page breaks. Designed for technical writers who want to ship polished PDFs without opening Word.",
    reasons: [
      "Every docs site renders to web but rarely to PDF. The conversion is lossy and ugly.",
      "Technical writers specifically lose their code-block syntax highlighting in current PDF converters.",
      "Custom fonts and CSS print rules are non-negotiable for a professional PDF.",
    ],
    category: "Writing",
    toolsCategorySlug: "writing",
    status: "in_development",
    voteCount: 76,
    submittedAt: "2026-02-01",
    acceptedAt: "2026-02-09",
    developmentStartedAt: "2026-02-20",
    estimatedShipDate: "2026-05-01",
    keywords: ["markdown to pdf", "md to pdf", "markdown pdf converter", "pdf from markdown"],
    ogTagline: "Markdown in, print-ready PDF out.",
  },
  {
    slug: "recipe-scaler",
    name: "Recipe Scaler",
    pitch: "Scale any recipe to feed 4 people, 40 people, or anywhere in between.",
    description:
      "Drop in a recipe — copied from a website, typed, or photographed — and tell it how many people you're feeding. The tool rescales every ingredient, converts units (cups → grams), and adjusts cooking times for altitude.",
    reasons: [
      "Half of online recipes don't scale cleanly (they say 'a pinch of salt' or 'one egg').",
      "Unit conversion is a real time-sink for cooks using metric vs. imperial.",
      "Photography the recipe and OCR-ing the ingredients is the hard part; the rest is math.",
    ],
    category: "Calculators",
    toolsCategorySlug: "calculators",
    status: "in_queue",
    voteCount: 64,
    submittedAt: "2026-02-04",
    acceptedAt: "2026-02-12",
    keywords: ["recipe scaler", "recipe converter", "cooking calculator", "kitchen math"],
    ogTagline: "From 4 to 40, with the math done.",
  },
  {
    slug: "unit-price-calculator",
    name: "Unit Price Calculator",
    pitch: "Compare the per-ounce cost of two products at the grocery store, in one tap.",
    description:
      "Scan a barcode or type the prices and weights of two products; get the per-unit cost in a single line. Built for the moment you're standing in the grocery aisle trying to decide between the 24-oz box and the 12-oz box.",
    reasons: [
      "Grocery prices are quoted in sizes that make comparison hard (per ounce, per gram, per load).",
      "The math is trivial but the cognitive load at the store is not.",
      "It's a one-second use case that compounds across every shopping trip.",
    ],
    category: "Calculators",
    toolsCategorySlug: "calculators",
    status: "pending_review",
    voteCount: 51,
    submittedAt: "2026-02-09",
    acceptedAt: "2026-02-16",
    keywords: ["unit price calculator", "price per ounce", "grocery comparison", "best deal"],
    ogTagline: "Which is actually cheaper?",
  },
  {
    slug: "json-to-typescript",
    name: "JSON → TypeScript Types",
    pitch:
      "Paste JSON, get a typed TypeScript interface. Handles unions, nullables, and recursive shapes.",
    description:
      "Drop a JSON sample (or a schema URL) and get a TypeScript interface with the right nullable handling, recursive shapes, and discriminated unions. Saves the 'convert this API response to types' step every developer does 10 times a day.",
    reasons: [
      "Every API integration starts with this conversion. It's rote work.",
      "Existing tools (json2ts, quicktype) miss nullables and recursive shapes — the exact cases that bite in production.",
      "It's a high-frequency, low-effort tool that pairs naturally with our AI tools.",
    ],
    category: "Developer",
    toolsCategorySlug: "developer",
    status: "shipped",
    voteCount: 187,
    submittedAt: "2026-01-15",
    acceptedAt: "2026-01-20",
    developmentStartedAt: "2026-01-28",
    shippedAt: "2026-02-22",
    keywords: ["json to typescript", "json2ts", "typescript types from json", "api types"],
    ogTagline: "Paste JSON, get types.",
  },
  {
    slug: "regex-playground",
    name: "Regex Playground",
    pitch: "Build, test, and explain a regex in real time. Includes a 30-recipe cookbook.",
    description:
      "A regex builder that shows matches highlighted as you type, with a plain-English explanation of every token. Includes a curated cookbook of 30 common patterns (email, URL, phone, credit card) you can paste and tweak.",
    reasons: [
      "Every developer avoids regex until they can't.",
      "regex101.com is great but intimidating for beginners.",
      "The 30-pattern cookbook covers 80% of real-world regex needs.",
    ],
    category: "Developer",
    toolsCategorySlug: "developer",
    status: "shipped",
    voteCount: 154,
    submittedAt: "2026-01-08",
    acceptedAt: "2026-01-14",
    developmentStartedAt: "2026-01-22",
    shippedAt: "2026-02-10",
    keywords: ["regex playground", "regex tester", "regex builder", "regex cookbook"],
    ogTagline: "Build, test, explain.",
  },
  {
    slug: "csv-diff",
    name: "CSV Diff",
    pitch:
      "Compare two CSV files cell-by-cell, with a side-by-side highlight and a one-click diff download.",
    description:
      "Drop in two CSVs (the old and the new) and get a side-by-side comparison with the changed cells highlighted. Add a column to compare on, then export the diff as a new CSV or a patch. The tool anyone who touches a database dumps wishes existed.",
    reasons: [
      "CSV diffs are a daily task for anyone in analytics, ops, or data engineering.",
      "Existing diff tools (git diff, meld) treat CSVs as text and produce useless output.",
      "Side-by-side highlighting with column-aware comparison is the obvious UX.",
    ],
    category: "Developer",
    toolsCategorySlug: "developer",
    status: "in_queue",
    voteCount: 89,
    submittedAt: "2026-01-30",
    acceptedAt: "2026-02-08",
    keywords: ["csv diff", "compare csv", "csv comparison", "data diff"],
    ogTagline: "What changed in this CSV?",
  },
  {
    slug: "youtube-to-article",
    name: "YouTube → Article",
    pitch:
      "Paste a YouTube URL, get a clean article with the transcript, key points, and a 3-tweet thread.",
    description:
      "Drop in any YouTube URL and get a clean reading-mode article: the full transcript cleaned up, the 5 key points, and a 3-tweet thread you can post. Saves the 'I watched a 40-minute video just to find the one thing I needed' problem.",
    reasons: [
      "Most long YouTube content has 5 minutes of signal in 40 minutes of video.",
      "Reading is 2-3x faster than watching for most information-density content.",
      "The 3-tweet thread is a strong share format that we can also cross-post to X.",
    ],
    category: "AI",
    toolsCategorySlug: "ai",
    status: "in_development",
    voteCount: 112,
    submittedAt: "2026-02-02",
    acceptedAt: "2026-02-11",
    developmentStartedAt: "2026-02-22",
    estimatedShipDate: "2026-05-20",
    keywords: ["youtube transcript", "youtube summary", "video to article", "youtube notes"],
    ogTagline: "Watch less, read more.",
  },
  {
    slug: "contract-clause-explainer",
    name: "Contract Clause Explainer",
    pitch: "Paste a contract clause, get a plain-English explanation and a list of red flags.",
    description:
      "Drop in a paragraph from a contract (rental agreement, SaaS ToS, NDA) and get a plain-English rewrite plus a list of red flags to watch out for. Built for people signing things they don't have a lawyer to read for them.",
    reasons: [
      "Most people sign contracts without reading them because the legalese is impenetrable.",
      "The pattern matches well with AI tools — extract clauses, explain, flag.",
      "The red-flag list is the highest-value part: knowing when to ask for a lawyer is more useful than explaining what's in the contract.",
    ],
    category: "AI",
    toolsCategorySlug: "ai",
    status: "pending_review",
    voteCount: 73,
    submittedAt: "2026-02-11",
    acceptedAt: "2026-02-18",
    keywords: ["contract explainer", "legal ai", "contract plain english", "legal red flags"],
    ogTagline: "Know what you're signing.",
  },
] as const;

const SUGGESTION_BY_SLUG = new Map(SUGGESTIONS.map((s) => [s.slug, s]));

export function getSuggestion(slug: string): Suggestion | undefined {
  return SUGGESTION_BY_SLUG.get(slug);
}

export function getAllSuggestionSlugs(): readonly string[] {
  return SUGGESTIONS.map((s) => s.slug);
}

/**
 * Status used for human-friendly labels and the timeline UI.
 * The order in this array is the order the timeline renders,
 * from earliest to latest.
 */
export const SUGGESTION_STATUS_FLOW: SuggestionStatus[] = [
  "pending_review",
  "in_queue",
  "in_development",
  "shipped",
];

export function statusLabel(s: SuggestionStatus): string {
  switch (s) {
    case "pending_review":
      return "Pending review";
    case "in_queue":
      return "In queue";
    case "in_development":
      return "In development";
    case "shipped":
      return "Shipped";
  }
}

export function statusTone(s: SuggestionStatus): "neutral" | "info" | "warning" | "success" {
  switch (s) {
    case "pending_review":
      return "neutral";
    case "in_queue":
      return "info";
    case "in_development":
      return "warning";
    case "shipped":
      return "success";
  }
}

/**
 * Sibling suggestions — same `toolsCategorySlug`, excluding self.
 * Used in the "Related tools in this category" rail.
 */
export function getRelatedSuggestions(slug: string, limit = 4): readonly Suggestion[] {
  const me = SUGGESTION_BY_SLUG.get(slug);
  if (!me) return [];
  return SUGGESTIONS.filter(
    (s) => s.slug !== slug && s.toolsCategorySlug === me.toolsCategorySlug
  ).slice(0, limit);
}
