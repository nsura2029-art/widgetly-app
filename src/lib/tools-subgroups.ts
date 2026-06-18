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
  //  - Edit = purple (creative)
  //  - Security = red (locks/caution — was orange, which clashed
  //    visually with the "convert to" blue)
  //  - AI = pink (playful, AI vibe)
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
      ],
    },
    {
      title: "Convert to PDF",
      accent: "blue",
      items: [
        { name: "JPG to PDF", icon: "ImagePlus" },
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
      accent: "red",
      items: [
        { name: "Unlock PDF", icon: "LockOpen" },
        { name: "Protect PDF", icon: "Lock" },
        { name: "Sign PDF", icon: "PenTool" },
        { name: "Redact PDF", icon: "EyeOff" },
        { name: "Compare PDFs", icon: "Eye" },
      ],
    },
    {
      title: "AI for PDF",
      accent: "pink",
      items: [
        { name: "AI Summarizer", icon: "Sparkles" },
        { name: "Translate PDF", icon: "Languages" },
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
      accent: "red",
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
      accent: "red",
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
