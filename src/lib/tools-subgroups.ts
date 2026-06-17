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

export type Subgroup = {
  /** Column header, e.g. "Organize PDF". Uppercased in the UI. */
  title: string;
  items: readonly SubTool[];
};

export const TOOLS_SUBGROUPS: Record<string, readonly Subgroup[]> = {
  // ---------------------------------------------------------------------
  // PDF — 7 columns modeled on the iLovePDF layout the user referenced.
  // ---------------------------------------------------------------------
  pdf: [
    {
      title: "Organize PDF",
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
      items: [
        { name: "Compress PDF", icon: "Minimize2" },
        { name: "Repair PDF", icon: "Wrench" },
      ],
    },
    {
      title: "Convert to PDF",
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
      items: [
        { name: "PDF to JPG", icon: "ImageMinus" },
        { name: "PDF to Word", icon: "FileText" },
        { name: "PDF to PowerPoint", icon: "Presentation" },
        { name: "PDF to Excel", icon: "Sheet" },
      ],
    },
    {
      title: "Edit PDF",
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
      items: [
        { name: "Resize Image", icon: "Maximize2" },
        { name: "Crop Image", icon: "Crop" },
        { name: "Rotate Image", icon: "RotateCw" },
        { name: "Compress Image", icon: "Minimize2" },
      ],
    },
    {
      title: "Convert Format",
      items: [
        { name: "Convert to WebP", icon: "ArrowLeftRight" },
        { name: "Convert to PNG", icon: "ArrowLeftRight" },
        { name: "Convert to JPG", icon: "ArrowLeftRight" },
      ],
    },
    {
      title: "AI Image Tools",
      items: [
        { name: "Background Remover", icon: "Eraser" },
        { name: "Image Upscaler", icon: "ZoomIn" },
        { name: "Image to Text (OCR)", icon: "ScanText" },
      ],
    },
    {
      title: "Effects",
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
      items: [
        { name: "Trim Video", icon: "Scissors" },
        { name: "Merge Clips", icon: "Combine" },
        { name: "Compress Video", icon: "Minimize2" },
        { name: "Convert to MP4", icon: "Film" },
      ],
    },
    {
      title: "Convert Format",
      items: [
        { name: "Convert to GIF", icon: "Image" },
        { name: "Convert to MP4", icon: "Film" },
        { name: "Extract Audio", icon: "Volume2" },
      ],
    },
    {
      title: "AI Video Tools",
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
      items: [
        { name: "AI Image Generator", icon: "ImagePlus" },
        { name: "Background Remover", icon: "Eraser" },
        { name: "Image Upscaler", icon: "ZoomIn" },
      ],
    },
    {
      title: "Career & Learning",
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
      items: [
        { name: "Mortgage Calculator", icon: "Home" },
        { name: "Loan Amortization", icon: "TrendingUp" },
        { name: "Tip Calculator", icon: "DollarSign" },
      ],
    },
    {
      title: "Health",
      items: [
        { name: "BMI Calculator", icon: "Heart" },
        { name: "Calorie Counter", icon: "Apple" },
      ],
    },
    {
      title: "Math",
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
      items: [
        { name: "JSON Formatter", icon: "Braces" },
        { name: "YAML Validator", icon: "CheckCircle2" },
        { name: "Code Beautifier", icon: "Code2" },
      ],
    },
    {
      title: "Encode & Decode",
      items: [
        { name: "Base64 Encoder", icon: "Binary" },
        { name: "JWT Decoder", icon: "Key" },
        { name: "Diff Viewer", icon: "Eye" },
      ],
    },
    {
      title: "Test",
      items: [{ name: "Regex Tester", icon: "Regex" }],
    },
  ],

  // ---------------------------------------------------------------------
  // SEO Tools
  // ---------------------------------------------------------------------
  seo: [
    {
      title: "Generate",
      items: [
        { name: "Meta Tag Generator", icon: "Tag" },
        { name: "XML Sitemap", icon: "Map" },
        { name: "Robots.txt Tester", icon: "Bot" },
      ],
    },
    {
      title: "Analyze",
      items: [
        { name: "Keyword Density", icon: "BarChart3" },
        { name: "SERP Preview", icon: "Eye" },
        { name: "Page Speed Audit", icon: "Gauge" },
      ],
    },
    {
      title: "Audit",
      items: [{ name: "Backlink Checker", icon: "Link" }],
    },
  ],

  // ---------------------------------------------------------------------
  // Writing Tools
  // ---------------------------------------------------------------------
  writing: [
    {
      title: "Edit & Polish",
      items: [
        { name: "Grammar Checker", icon: "CheckCircle2" },
        { name: "Tone Rewriter", icon: "MessageSquare" },
        { name: "Paraphraser", icon: "Repeat" },
      ],
    },
    {
      title: "Analyze",
      items: [
        { name: "Word Counter", icon: "Hash" },
        { name: "Readability Score", icon: "BarChart3" },
        { name: "Headline Analyzer", icon: "Heading" },
      ],
    },
    {
      title: "Generate",
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
