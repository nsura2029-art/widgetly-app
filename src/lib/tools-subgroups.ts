import { TOOLS_CATEGORIES } from "./tools-categories";

/**
 * Sub-groupings for the ToolsBanner mega menu. Each category can
 * have an ordered list of `Subgroup`s (columns), each with a
 * header and a list of sub-tools. Sub-tools are the actual things
 * a user clicks on — they link to `/tools/[category]#[anchor]`,
 * where the anchor is the slugified sub-tool name.
 *
 * Why a separate file from `tools-categories.ts`?
 *  - `tools-categories.ts` is the canonical category registry
 *    (slug, name, count, intro, examples). It's small and stable.
 *  - Sub-groupings are display-only data: which columns to show
 *    in the mega menu and how to cluster sub-tools. They're
 *    verbose and likely to be iterated on (column ordering,
 *    splitting/merging subgroups) without affecting any other
 *    surface that consumes category data.
 *  - Sub-tool icons are unique to this UI surface. Keeping them
 *    here avoids polluting the category schema with display-
 *    only fields like `icon`.
 *
 * Lookup:
 *   `getSubgroups("pdf")` returns `Subgroup[]` or `undefined` if
 *   the category has no sub-groupings defined (the banner will
 *   then fall back to the flat `examples` list from the category).
 */

export type SubTool = {
  /** Display name shown in the mega menu, e.g. "Merge PDF". */
  name: string;
  /** Lucide icon name from `src/lib/icons.ts`. */
  icon: string;
};

/**
 * Accent palette for sub-tool icon tiles. Each subgroup picks
 * one of these, which determines the background color of the
 * small icon tile next to every item in that column. The colors
 * mirror the iLovePDF mega-menu pattern the user referenced:
 * action types share a color (red = organize, green = optimize,
 * blue = convert, purple = edit, etc.) so the column reads as
 * a unit at a glance.
 *
 * Why a typed enum instead of free-form Tailwind classes?
 *  - Constrains the palette so we don't end up with 30
 *    one-off colors.
 *  - Lets us centrally tweak (e.g. switch from bg-blue-500 to
 *    bg-blue-600) by editing one map.
 *  - Lets `Subgroup.accent` be a discriminated field that the
 *    mega-menu code can validate.
 */
export type AccentColor =
  | "red"
  | "green"
  | "blue"
  | "indigo"
  | "purple"
  | "orange"
  | "pink"
  | "teal"
  | "amber"
  | "cyan";

export type Subgroup = {
  /** Column header, e.g. "Organize PDF". Uppercased in the UI. */
  title: string;
  /**
   * Accent color for the icon tiles in this column. Maps to a
   * Tailwind class in the mega-menu code via a static lookup
   * (so Tailwind's JIT sees all class names at build time).
   */
  accent: AccentColor;
  items: readonly SubTool[];
};

export const TOOLS_SUBGROUPS: Record<string, readonly Subgroup[]> = {
  // ---------------------------------------------------------------------
  // PDF — 7 columns modeled on the iLovePDF layout the user referenced.
  //
  // Color philosophy: action-type mapping with a refined, modern feel
  // (less candy-primary than the original iLovePDF palette).
  //  - Organize = orange (warm, "combine" energy)
  //  - Optimize = teal (fresh, growth)
  //  - Convert to = blue (outbound, open)
  //  - Convert from = cyan (inbound, lighter counterpart to blue)
  //  - Edit = purple (creative) — used for Edit PDF AND Edit Video
  //  - Security = indigo (trustworthy, structural — replaced red in 2026-06)
  //  - AI = pink (playful, AI vibe)
  //  - Health = teal (wellness, growth — replaced red in 2026-06)
  //
  // Red was intentionally removed from the palette — it read as
  // "destructive / error" and clashed with our success-state styling.
  // ---------------------------------------------------------------------
  pdf: [
    {
      title: "Organize PDF",
      accent: "orange",
      items: [
        { name: "Merge PDF", icon: "Combine" },
        { name: "Split PDF", icon: "Split" },
        { name: "Remove pages", icon: "FileX" },
        { name: "Extract pages", icon: "FileOutput" },
        { name: "Insert PDF Pages", icon: "FilePlus" },
        { name: "Reorder pages", icon: "ArrowUpDown" },
        { name: "Scan to PDF", icon: "ScanLine" },
      ],
    },
    {
      title: "Optimize PDF",
      accent: "teal",
      items: [
        { name: "Compress PDF", icon: "Minimize2" },
        { name: "Repair PDF", icon: "Wrench" },
        { name: "OCR PDF", icon: "ScanText" },
      ],
    },
    {
      title: "Convert to PDF",
      accent: "blue",
      items: [
        { name: "JPG to PDF", icon: "ImagePlus" },
        { name: "PNG to PDF", icon: "FileImage" },
        { name: "HEIC to PDF", icon: "Camera" },
        { name: "Word to PDF", icon: "FileText" },
        { name: "PowerPoint to PDF", icon: "Presentation" },
        { name: "Excel to PDF", icon: "Sheet" },
        { name: "HTML to PDF", icon: "Code2" },
      ],
    },
    {
      title: "Convert from PDF",
      accent: "cyan",
      items: [
        { name: "PDF to JPG", icon: "ImageMinus" },
        { name: "PDF to PNG", icon: "FileImage" },
        { name: "PDF to Word", icon: "FileText" },
        { name: "PDF to PowerPoint", icon: "Presentation" },
        { name: "PDF to Excel", icon: "Sheet" },
      ],
    },
    {
      title: "Edit PDF",
      accent: "purple",
      items: [
        { name: "Edit PDF", icon: "Edit3" },
        { name: "Rotate PDF", icon: "RotateCw" },
        { name: "Add Watermark", icon: "Stamp" },
        { name: "Add Page Numbers", icon: "Hash" },
        { name: "Crop PDF", icon: "Crop" },
      ],
    },
    {
      title: "PDF Security",
      accent: "indigo",
      items: [
        { name: "Unlock PDF", icon: "LockOpen" },
        { name: "Protect PDF", icon: "Lock" },
        { name: "Sign PDF", icon: "PenTool" },
        { name: "Fill & Sign", icon: "Signature" },
        { name: "Request e-signatures", icon: "Send" },
        { name: "Redact PDF", icon: "EyeOff" },
        { name: "Compare PDFs", icon: "Eye" },
      ],
    },
    {
      title: "AI for PDF",
      accent: "pink",
      items: [
        { name: "AI Summarizer", icon: "Sparkles" },
        { name: "Chat with PDF", icon: "MessageCircle" },
        { name: "Translate PDF", icon: "Languages" },
        { name: "Generate Presentation", icon: "Presentation" },
      ],
    },
  ],

  // ---------------------------------------------------------------------
  // Image Tools
  // ---------------------------------------------------------------------
  image: [
    {
      title: "Edit Image",
      accent: "cyan",
      items: [
        { name: "Resize Image", icon: "Maximize2" },
        { name: "Crop Image", icon: "Crop" },
        { name: "Rotate Image", icon: "RotateCw" },
        { name: "Compress Image", icon: "Minimize2" },
      ],
    },
    {
      title: "Convert Format",
      accent: "teal",
      items: [
        { name: "Convert to WebP", icon: "ArrowLeftRight" },
        { name: "Convert to PNG", icon: "ArrowLeftRight" },
        { name: "Convert to JPG", icon: "ArrowLeftRight" },
      ],
    },
    {
      title: "AI Image Tools",
      accent: "purple",
      items: [
        { name: "Background Remover", icon: "Eraser" },
        { name: "Image Upscaler", icon: "ZoomIn" },
        { name: "Image to Text (OCR)", icon: "ScanText" },
      ],
    },
    {
      title: "Effects",
      accent: "amber",
      items: [
        { name: "Add Watermark", icon: "Stamp" },
        { name: "Crop to Circle", icon: "Circle" },
      ],
    },
  ],

  // ---------------------------------------------------------------------
  // Video Tools
  // ---------------------------------------------------------------------
  video: [
    {
      title: "Edit Video",
      accent: "purple",
      items: [
        { name: "Trim Video", icon: "Scissors" },
        { name: "Merge Clips", icon: "Combine" },
        { name: "Compress Video", icon: "Minimize2" },
        { name: "Convert to MP4", icon: "Film" },
      ],
    },
    {
      title: "Convert Format",
      accent: "cyan",
      items: [
        { name: "Convert to GIF", icon: "Image" },
        { name: "Convert to MP4", icon: "Film" },
        { name: "Extract Audio", icon: "Volume2" },
      ],
    },
    {
      title: "AI Video Tools",
      accent: "indigo",
      items: [
        { name: "Video to Text", icon: "FileText" },
        { name: "Generate Subtitles", icon: "Captions" },
        { name: "Translate Video", icon: "Languages" },
      ],
    },
  ],

  // ---------------------------------------------------------------------
  // AI Tools
  // ---------------------------------------------------------------------
  ai: [
    {
      title: "Writing",
      accent: "blue",
      items: [
        { name: "AI Writer", icon: "Sparkles" },
        { name: "AI Summarizer", icon: "FileText" },
        { name: "AI Translator", icon: "Languages" },
        { name: "AI Email Reply", icon: "Mail" },
        { name: "Paraphraser", icon: "Repeat" },
      ],
    },
    {
      title: "Image",
      accent: "pink",
      items: [
        { name: "AI Image Generator", icon: "ImagePlus" },
        { name: "Background Remover", icon: "Eraser" },
        { name: "Image Upscaler", icon: "ZoomIn" },
      ],
    },
    {
      title: "Career & Learning",
      accent: "teal",
      items: [
        { name: "AI Resume Builder", icon: "Briefcase" },
        { name: "AI Tutor", icon: "GraduationCap" },
      ],
    },
  ],

  // ---------------------------------------------------------------------
  // Calculators
  // ---------------------------------------------------------------------
  calculators: [
    {
      title: "Finance",
      accent: "green",
      items: [
        { name: "Mortgage Calculator", icon: "Home" },
        { name: "Loan Amortization", icon: "TrendingUp" },
        { name: "Tip Calculator", icon: "DollarSign" },
      ],
    },
    {
      title: "Health",
      accent: "teal",
      items: [
        { name: "BMI Calculator", icon: "Heart" },
        { name: "Calorie Counter", icon: "Apple" },
      ],
    },
    {
      title: "Math",
      accent: "indigo",
      items: [
        { name: "Percentage Change", icon: "Percent" },
        { name: "Scientific Calculator", icon: "Calculator" },
      ],
    },
  ],

  // ---------------------------------------------------------------------
  // Developer Tools
  // ---------------------------------------------------------------------
  developer: [
    {
      title: "Format & Validate",
      accent: "cyan",
      items: [
        { name: "JSON Formatter", icon: "Braces" },
        { name: "YAML Validator", icon: "CheckCircle2" },
        { name: "Code Beautifier", icon: "Code2" },
      ],
    },
    {
      title: "Encode & Decode",
      accent: "purple",
      items: [
        { name: "Base64 Encoder", icon: "Binary" },
        { name: "JWT Decoder", icon: "Key" },
        { name: "Diff Viewer", icon: "Eye" },
      ],
    },
    {
      title: "Test",
      accent: "amber",
      items: [{ name: "Regex Tester", icon: "Regex" }],
    },
  ],

  // ---------------------------------------------------------------------
  // SEO Tools
  // ---------------------------------------------------------------------
  seo: [
    {
      title: "Generate",
      accent: "cyan",
      items: [
        { name: "Meta Tag Generator", icon: "Tag" },
        { name: "XML Sitemap", icon: "Map" },
        { name: "Robots.txt Tester", icon: "Bot" },
      ],
    },
    {
      title: "Analyze",
      accent: "indigo",
      items: [
        { name: "Keyword Density", icon: "BarChart3" },
        { name: "SERP Preview", icon: "Eye" },
        { name: "Page Speed Audit", icon: "Gauge" },
      ],
    },
    {
      title: "Audit",
      accent: "teal",
      items: [{ name: "Backlink Checker", icon: "Link" }],
    },
  ],

  // ---------------------------------------------------------------------
  // Writing Tools
  // ---------------------------------------------------------------------
  writing: [
    {
      title: "Edit & Polish",
      accent: "teal",
      items: [
        { name: "Grammar Checker", icon: "CheckCircle2" },
        { name: "Tone Rewriter", icon: "MessageSquare" },
        { name: "Paraphraser", icon: "Repeat" },
      ],
    },
    {
      title: "Analyze",
      accent: "blue",
      items: [
        { name: "Word Counter", icon: "Hash" },
        { name: "Readability Score", icon: "BarChart3" },
        { name: "Headline Analyzer", icon: "Heading" },
      ],
    },
    {
      title: "Generate",
      accent: "amber",
      items: [{ name: "Lorem Ipsum Generator", icon: "Pilcrow" }],
    },
  ],
};

/**
 * Get sub-groupings for a category slug, or `undefined` if the
 * category has no detailed mega-menu definition (the banner will
 * fall back to the flat `examples` list from the category).
 */
export function getSubgroups(slug: string): readonly Subgroup[] | undefined {
  return TOOLS_SUBGROUPS[slug];
}

/** Convenience: list of category slugs that have detailed mega-menu data. */
export const FEATURED_WITH_SUBGROUPS: readonly string[] = Object.keys(TOOLS_SUBGROUPS).filter(
  (slug) =>
    // Only include featured categories that also exist in the
    // category registry. Keeps the two registries loosely coupled
    // — adding a sub-grouping for a non-featured category doesn't
    // accidentally promote it to the banner.
    TOOLS_CATEGORIES.some((c) => c.slug === slug)
);

/* ------------------------------------------------------------------ */
/* Per-tool icon lookup                                                */
/* ------------------------------------------------------------------ */

/**
 * Look up the icon for a single tool in a category. Scans the
 * category's `TOOLS_SUBGROUPS` for a sub-tool whose `name` matches
 * (case-insensitive, whitespace-trimmed). Returns the Lucide icon
 * name (e.g. "Combine") or `undefined` if no subgroup has an entry
 * for that tool.
 *
 * Used by `/en/tools/[category]` to render a relevant icon next to
 * each example in the right rail — instead of repeating the
 * category icon for every row (which is what the page did before
 * this change). The iLovePDF / Smallpdf model is "every tool has a
 * visual identity", so each row should carry its own glyph.
 *
 * The lookup is intentionally forgiving: tools shipped before
 * subgroups were defined still render with the category icon as a
 * fallback, so adding new examples to `TOOLS_CATEGORIES` doesn't
 * silently lose icons. See `getToolIconName` callers.
 */
export function getToolIconName(categorySlug: string, toolName: string): string | undefined {
  const groups = TOOLS_SUBGROUPS[categorySlug];
  if (!groups) return undefined;
  const needle = toolName.trim().toLowerCase();
  for (const group of groups) {
    for (const item of group.items) {
      if (item.name.trim().toLowerCase() === needle) return item.icon;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Heuristic per-tool icon inference (D1 / live-data fallback)        */
/* ------------------------------------------------------------------ */

/**
 * Keyword → Lucide-icon map used by `inferToolIconName`. Each
 * entry is `[regex, iconName]`; the FIRST match wins. Regexes are
 * tested against `toolName.toLowerCase()`.
 *
 * Why a heuristic fallback instead of strict lookup?
 *   The D1 `admin_tools` table is the live source of truth for the
 *   tools list once the admin pipeline is seeded. Its rows were
 *   authored independently from the static catalog in
 *   `TOOLS_CATEGORIES` / `TOOLS_SUBGROUPS`, so most D1 tool names
 *   don't appear in `TOOLS_SUBGROUPS` (e.g. D1 AI tools: "Ai
 *   Grammar Checker", "Ai Paraphraser", "Ai Voice Generator" —
 *   the static subgroup has "AI Writer", "AI Summarizer" instead).
 *   When `getToolIconName` returns undefined for a D1 row, callers
 *   were falling back to the CATEGORY icon, which made every
 *   right-rail row in a category look identical (the user
 *   reported: "I dont see the new icons for … each tool in the
 *   category"). This heuristic gives each tool a distinct glyph
 *   based on what its name says about what it does.
 *
 * Order matters: more specific patterns come first ("grammar
 *   checker" before the generic "check", "pdf to jpg" before
 *   "pdf to"). Patterns are case-insensitive via the lowercase
 *   haystack built by `inferToolIconName`.
 *
 * Icon names MUST exist in `src/lib/icons.ts`; otherwise
 * `getIcon()` silently falls back to Sparkles.
 */
const TOOL_ICON_KEYWORDS: ReadonlyArray<readonly [RegExp, string]> = [
  // ----- PDF: organize / optimize -----
  [/merge|combine|join/, "Combine"],
  [/split|divide/, "Split"],
  [/compress|shrink|reduce|minimize/, "Minimize2"],
  [/rotate/, "RotateCw"],
  [/reorder|arrange/, "ArrowUpDown"],
  [/repair|fix\s?pdf|recover/, "Wrench"],
  [/scan/, "ScanLine"],

  // ----- PDF: security / edit -----
  [/sign|e-?sign|signature/, "PenTool"],
  [/fill.*sign|sign.*fill/, "Signature"],
  [/request.*signature|send.*signature|e-?sign.*request/, "Send"],
  [/protect|lock|encrypt|password/, "Lock"],
  [/unlock|decrypt|remove.*password/, "LockOpen"],
  [/redact/, "EyeOff"],
  [/watermark|stamp/, "Stamp"],
  [/page\s?number/, "Hash"],
  [/crop/, "Crop"],
  [/compare/, "Eye"],
  [/ocr|extract\s?text|text.*extract/, "ScanText"],
  [/edit|modify/, "Edit3"],

  // ----- PDF: format conversions (specific before generic) -----
  [/to\s?pdf|into\s?pdf|convert.*pdf|pdf.*create/, "FileText"],
  [/pdf\s?to\s?(jpg|jpeg)/, "Image"],
  [/pdf\s?to\s?png/, "FileImage"],
  [/pdf\s?to\s?word|word.*from\s?pdf/, "FileText"],
  [/pdf\s?to\s?powerpoint|pdf\s?to\s?ppt|ppt.*from\s?pdf/, "Presentation"],
  [/pdf\s?to\s?excel|pdf\s?to\s?xlsx|excel.*from\s?pdf/, "Sheet"],
  [/heic.*pdf/, "Camera"],

  // ----- Image operations -----
  [/resize|scale|expand|enlarge/, "Maximize2"],
  [/upscale/, "ZoomIn"],
  [/crop|cut|trim/, "Crop"],
  [/compressor|compress/, "Minimize2"],
  [/convert|transform|change\s?format/, "ArrowLeftRight"],
  [/barcode|qr/, "BarChart3"],
  [/circle|round/, "Circle"],
  [/enhance|sharpen|polish/, "Sparkles"],
  [/remove\s?background|background.*remov/, "Eraser"],
  [/image\s?to\s?text|picture\s?to\s?text|ocr/, "ScanText"],

  // ----- Video operations -----
  [/trim|cut\s?video|video.*cut/, "Scissors"],
  [/audio.*extract|extract.*audio/, "Volume2"],
  [/subtitle|caption/, "Captions"],
  [/gif/, "Image"],
  [/video.*to\s?mp4|to\s?mp4|mp4.*convert/, "Film"],
  [/video.*to\s?text|video.*transcribe/, "FileText"],
  [/video.*translat|translat.*video/, "Languages"],
  [/merge\s?clip|combine\s?clip/, "Combine"],

  // ----- AI: writing / language -----
  [/grammar|spell\s?check|proofread/, "CheckCircle2"],
  [/paraphrase|rewrite|rephrase/, "Repeat"],
  [/summari[sz]e|summary/, "FileText"],
  [/voice|tts|text\s?to\s?speech|speech\s?to\s?text/, "Volume2"],
  [/translate|translation/, "Languages"],
  [/email|reply|mail|cover\s?letter/, "Mail"],
  [/tone/, "MessageSquare"],
  [/readability/, "BarChart3"],
  [/headline|heading|title\s?score/, "Heading"],
  [/lorem|placeholder\s?text/, "Pilcrow"],
  [/chat|conversation|qa/, "MessageCircle"],

  // ----- AI: image / vision -----
  [/image\s?generator|generate\s?image|ai\s?art|text\s?to\s?image/, "ImagePlus"],
  [/upscale|enlarge\s?image/, "ZoomIn"],
  [/inpaint|outpaint|edit\s?image\s?with\s?ai/, "Edit3"],

  // ----- AI: career & learning -----
  [/resume|\bcv\b/, "Briefcase"],
  [/tutor|teach|learn|course|study\s?guide|flashcard/, "GraduationCap"],

  // ----- Calculator -----
  [/percentage|percent|%\s?change/, "Percent"],
  [/age/, "Calendar"],
  [/\bbmi\b|body\s?mass/, "Heart"],
  [/mortgage|home\s?loan|house/, "Home"],
  [/loan|amortiz|interest/, "TrendingUp"],
  [/tip|gratuity/, "Receipt"],
  [/currency|exchange|forex/, "DollarSign"],
  [/calorie|diet|nutrition|macro/, "Apple"],
  [/scientific|equation|formula/, "Calculator"],
  [/\bgpa\b|grade\s?point/, "GraduationCap"],
  [/unit|measurement/, "ArrowLeftRight"],

  // ----- Developer -----
  [/\bjson\b/, "Braces"],
  [/\byaml\b/, "CheckCircle2"],
  [/beautif|format|pretty|prettier/, "Code2"],
  [/base64|encode|decode/, "Binary"],
  [/\bjwt\b|token|api\s?key/, "Key"],
  [/\bdiff\b/, "Eye"],
  [/regex|regular\s?expression/, "Regex"],
  [/\buuid\b/, "Hash"],

  // ----- SEO -----
  [/meta\s?tag/, "Tag"],
  [/sitemap/, "Map"],
  [/robots/, "Bot"],
  [/keyword/, "BarChart3"],
  [/\bserp\b/, "Eye"],
  [/page\s?speed|performance|audit|core\s?web/, "Gauge"],
  [/backlink/, "Link"],

  // ----- Business / generic verbs -----
  [/generate|create|build/, "Sparkles"],
  [/analy[sz]e|report|insight|metric/, "BarChart3"],
  [/search|find|lookup|discover/, "Search"],
  [/extract/, "FileOutput"],
  [/remove|delete|erase|strip/, "Eraser"],
  [/add|insert|append/, "FilePlus"],
  [/view|preview|read/, "Eye"],
];

/**
 * Heuristically infer a Lucide icon name for a tool based on
 * keywords in its display name. Used as a SECOND-PASS fallback
 * by callers (e.g. /en/tools/[category]) when
 * `getToolIconName(cat, name)` returns undefined — typically
 * because the tool was sourced from D1 `admin_tools` with a name
 * that doesn't appear in the static `TOOLS_SUBGROUPS` registry.
 *
 * Returns the icon name string (e.g. `"Combine"`) or `undefined`
 * if no keyword matched. Callers should fall back to the
 * category icon in that case (so the row still has a glyph
 * instead of rendering an empty tile).
 *
 * Pure display-only fallback — the icon has no semantic meaning
 * beyond "what does this tool roughly do". Lookup is
 * case-insensitive; first match wins.
 */
export function inferToolIconName(toolName: string): string | undefined {
  if (!toolName) return undefined;
  const haystack = toolName.toLowerCase();
  for (const [pattern, icon] of TOOL_ICON_KEYWORDS) {
    if (pattern.test(haystack)) return icon;
  }
  return undefined;
}
