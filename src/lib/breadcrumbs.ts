import { SITE_CONFIG, CATEGORIES } from "./constants";

/**
 * Breadcrumb route generator + Schema.org BreadcrumbList builder.
 *
 * Design goals:
 * - Zero hardcoded paths; works for any future route automatically.
 * - Slug → title mapping table for known labels, with a graceful fallback
 *   that converts hyphens/underscores into "PDF Tools"-style titles.
 * - Pure functions: cheap to memoize and safe to call during SSR.
 * - Server-friendly: no client-only APIs, no router reads.
 *
 * Per-page overrides (e.g. using a blog post's real title) are supported via
 * `customLabels`, a map keyed by the URL segment to override.
 */

export type Crumb = {
  /** Display label shown to users and used in JSON-LD `name`. */
  label: string;
  /** Absolute or root-relative path the crumb links to. */
  href: string;
};

export type GenerateBreadcrumbsOptions = {
  /**
   * Override the auto-generated label for a specific segment. Use this when
   * the slug is opaque (e.g. a blog post id) and you have the real title
   * in hand. Keys are segment names; values are the display label.
   *
   * Example: { "best-pdf-tools": "Best PDF Tools" }
   */
  customLabels?: Record<string, string>;
  /**
   * Optional pre-built list. When provided, generation is skipped and the
   * list is returned as-is (still normalized through `normalizeCrumbs`).
   * Useful for routes whose breadcrumb trail can't be derived from the
   * path alone (e.g. a category page whose parent isn't a literal URL
   * ancestor).
   */
  override?: Crumb[];
  /**
   * Drop the leading "Home" crumb. Used when the surrounding layout
   * already renders a brand-level home link (e.g. compact UIs).
   */
  hideHome?: boolean;
  /**
   * Strip a query string and/or hash before processing. Defaults to true.
   */
  stripQueryHash?: boolean;
  /**
   * Origin used to build absolute URLs for JSON-LD. Defaults to
   * `SITE_CONFIG.url`.
   */
  baseUrl?: string;
};

/* -------------------------------------------------------------------------- */
/*  Title resolution                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Known slug → display label overrides. Add new entries here when a slug
 * should render as something other than its hyphenated form.
 *
 * We seed it from `CATEGORIES` so the canonical category slugs always
 * render correctly without a second source of truth.
 */
const KNOWN_LABELS: Record<string, string> = {
  home: "Home",
  // Categories (auto-derived from CATEGORIES below for type safety)
  ...Object.fromEntries(
    CATEGORIES.map((c) => [c.slug, c.name] as const),
  ),
  // Top-level sections
  blog: "Blog",
  about: "About",
  contact: "Contact",
  suggest: "Suggest a Tool",
  // Legal / system
  "privacy-policy": "Privacy Policy",
  "terms-and-conditions": "Terms & Conditions",
  "cookies-policy": "Cookies Policy",
  security: "Security",
  // Common slugs the platform will grow into
  tools: "Tools",
  help: "Help",
  categories: "Categories",
  features: "Features",
  dashboard: "Dashboard",
  profile: "Profile",
  account: "Account",
  settings: "Settings",
  pricing: "Pricing",
  changelog: "Changelog",
  status: "Status",
};

/**
 * Convert a URL slug into a human-readable title.
 *
 *   "merge-pdf"      -> "Merge PDF"
 *   "word_counter"   -> "Word Counter"
 *   "removeBackground" -> "Remove Background"
 *   "best-pdf-tools" -> "Best PDF Tools"
 *
 * Rules:
 * 1. Replace separators (`-`, `_`) with spaces.
 * 2. Collapse runs of whitespace.
 * 3. Title-case every word EXCEPT a small allowlist of all-caps tokens
 *    (PDF, AI, SEO, JSON, URL, HTML, CSS, JS, JPG, PNG, SVG, MP4, MP3,
 *    QR, UI, UX, API, SDK, IDE, CSV, XML, YAML, DOM, SQL, etc.) which
 *    are restored to uppercase after title-casing.
 */
const UPPERCASE_ALLOWLIST = new Set([
  "pdf",
  "ai",
  "seo",
  "json",
  "url",
  "html",
  "css",
  "js",
  "jpg",
  "jpeg",
  "png",
  "svg",
  "gif",
  "webp",
  "avif",
  "mp4",
  "mp3",
  "webm",
  "qr",
  "ui",
  "ux",
  "api",
  "sdk",
  "ide",
  "csv",
  "xml",
  "yaml",
  "dom",
  "sql",
  "xml",
  "rest",
  "gps",
  "ios",
  "macos",
  "tts",
  "stt",
  "ocr",
  "faq",
]);

export function slugToTitle(slug: string): string {
  if (!slug) return "";

  // Normalize separators and camelCase boundaries.
  const spaced = slug
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!spaced) return slug;

  return spaced
    .split(" ")
    .map((word) => {
      if (UPPERCASE_ALLOWLIST.has(word)) return word.toUpperCase();
      // Title-case: uppercase first letter, keep the rest as-is.
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Resolve the display label for a single segment by checking known
 * overrides, caller-supplied custom labels, and finally the slug→title
 * converter.
 */
function resolveLabel(segment: string, custom?: Record<string, string>): string {
  if (custom && Object.prototype.hasOwnProperty.call(custom, segment)) {
    const value = custom[segment];
    if (value && value.length > 0) return value;
  }
  if (Object.prototype.hasOwnProperty.call(KNOWN_LABELS, segment)) {
    return KNOWN_LABELS[segment] as string;
  }
  return slugToTitle(segment);
}

/* -------------------------------------------------------------------------- */
/*  Crumb generation                                                          */
/* -------------------------------------------------------------------------- */

/** Strip query string and hash from a path. */
function cleanPath(path: string, stripQueryHash: boolean): string {
  if (!stripQueryHash) return path;
  return path.split(/[?#]/)[0] ?? path;
}

/**
 * Build the crumb trail for a given URL path.
 *
 * Always leads with "Home" (unless `hideHome`). Subsequent crumbs are
 * derived from each path segment.
 */
export function generateBreadcrumbs(
  path: string,
  options: GenerateBreadcrumbsOptions = {},
): Crumb[] {
  if (options.override && options.override.length > 0) {
    return normalizeCrumbs(options.override, options);
  }

  const cleaned = cleanPath(path, true);
  // Normalize trailing slash (except for root).
  const normalized =
    cleaned === "/" || cleaned === ""
      ? "/"
      : cleaned.replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  // Home (or root).
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];

  // Build up cumulative paths.
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({
      label: resolveLabel(segment, options.customLabels),
      href: acc,
    });
  }

  return normalizeCrumbs(crumbs, options);
}

function normalizeCrumbs(
  crumbs: Crumb[],
  options: GenerateBreadcrumbsOptions,
): Crumb[] {
  const next = options.hideHome ? crumbs.slice(1) : crumbs;
  // Make sure every href is a root-relative path; that's what Next/Link expects.
  return next.map((c) => ({
    label: c.label,
    href: c.href.startsWith("/") ? c.href : `/${c.href}`,
  }));
}

/* -------------------------------------------------------------------------- */
/*  JSON-LD                                                                   */
/* -------------------------------------------------------------------------- */

export type BreadcrumbSchema = {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
};

/**
 * Build a Schema.org BreadcrumbList from a crumb trail.
 *
 * The `item` URLs are always absolute (using `baseUrl` or `SITE_CONFIG.url`)
 * because Google's documentation requires absolute URLs in JSON-LD.
 */
export function generateBreadcrumbSchema(
  crumbs: ReadonlyArray<Crumb>,
  baseUrl: string = SITE_CONFIG.url,
): BreadcrumbSchema {
  const origin = baseUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${origin}${c.href === "/" ? "" : c.href}`,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Analytics (opt-in)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Payload for a `breadcrumb_click` analytics event. Emit from your
 * analytics layer only when telemetry is enabled.
 */
export type BreadcrumbClickEvent = {
  event: "breadcrumb_click";
  source_page: string;
  destination_page: string;
  breadcrumb_depth: number;
};

export function buildBreadcrumbClickEvent(
  fromPath: string,
  toPath: string,
  depth: number,
): BreadcrumbClickEvent {
  return {
    event: "breadcrumb_click",
    source_page: fromPath,
    destination_page: toPath,
    breadcrumb_depth: depth,
  };
}
