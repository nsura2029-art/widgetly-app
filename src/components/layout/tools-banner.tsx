import { Link } from "@/i18n/navigation";
import { getIcon } from "@/lib/icons";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";

/**
 * Slugs shown in the banner. Picked to be a representative mix of
 * the most popular categories (PDF + Image + AI are the top three
 * search intent clusters for the brand) plus a couple of long-tail
 * ones (Calculators, Developer) so the row reads as a tool
 * discovery surface, not just the top 3.
 *
 * Order is intentional: scanning left-to-right should go from
 * "common need" (PDF) to "power user" (Developer).
 */
const FEATURED_SLUGS = [
  "pdf",
  "image",
  "video",
  "ai",
  "calculators",
  "developer",
  "seo",
  "writing",
] as const;

/**
 * Light, sticky-on-scroll band that sits between the page header
 * and the page content. Replaces the per-page breadcrumb.
 *
 * Design notes:
 *  - background-muted/30 gives a soft tinted band that reads as
 *    "this is a global utility surface" without competing with
 *    the header (which uses bg-background).
 *  - backdrop-blur makes the band feel "above" the content when
 *    the user scrolls, even though the band is not sticky. (It's
 *    not sticky because the header is — stacking two sticky
 *    elements at top-0 and top-16 doubles the height the user
 *    has to scroll past to reach content.)
 *  - `overflow-x-auto` + `shrink-0` on each chip means the row
 *    scrolls horizontally on narrow viewports instead of wrapping
 *    into a 2-row stack. On a 320px viewport, you see ~2 chips
 *    and can swipe for the rest.
 *  - Tool names are short ("PDF Tools", "AI Tools") to keep the
 *    row dense; the actual tool picker lives on the category
 *    pages.
 */
export function ToolsBanner() {
  const featured = FEATURED_SLUGS.map((slug) =>
    TOOLS_CATEGORIES.find((c) => c.slug === slug)
  ).filter((c): c is NonNullable<typeof c> => c !== undefined);

  return (
    <nav
      aria-label="Featured tools"
      className="border-border/60 bg-muted/30 supports-[backdrop-filter]:bg-muted/20 border-b backdrop-blur"
    >
      <div className="container flex items-center gap-1 overflow-x-auto py-2">
        <span className="text-muted-foreground hidden shrink-0 px-2 text-[11px] font-medium tracking-wide uppercase sm:inline">
          Tools
        </span>
        {featured.map((cat) => {
          const Icon = getIcon(cat.icon);
          return (
            <Link
              key={cat.slug}
              href={`/tools/${cat.slug}`}
              className="text-muted-foreground hover:text-foreground hover:bg-background inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
