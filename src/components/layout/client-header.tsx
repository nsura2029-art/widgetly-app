/**
 * Server component for the site header.
 *
 * Fetches the live tools data needed by the mega menu and mobile
 * sheet, then hands it off to the interactive client shell.
 *
 * ## Why the server/client split
 *
 * D1 is only accessible from the server. The header needs that data
 * to render accurate "live tool" counts in the mega panel. But the
 * header is also a stateful surface (open/close the mega menu, open
 * the mobile sheet, hover-tolerance, Esc-to-close, Clerk sign-in/out
 * UI, etc.) - that's pure client work.
 *
 * We split into two files:
 *  - This file (server, async): the data layer. Runs once per
 *    request, calls `getHeaderToolsData()`, passes the result down
 *    as plain serializable props.
 *  - `client-header-shell.tsx` (client): the interactivity layer.
 *    Receives categories as props, manages all UI state including
 *    the Clerk auth buttons.
 *
 * The default export of this file is still `ClientHeader`, so the
 * import in `[locale]/layout.tsx` (`import ClientHeader from ...`)
 * doesn't need to change.
 *
 * ## Static vs dynamic
 *
 * The layout is static-rendered at build time. D1 calls inside
 * `getHeaderToolsData()` run once at build, and the result is baked
 * into the static HTML. This means the live tool counts in the
 * header reflect the build-time D1 state - they don't auto-refresh
 * until the next deploy.
 *
 * That's an acceptable trade-off for the header mega menu (it
 * gracefully falls back to the static `TOOLS_CATEGORIES[].count`
 * when D1 returns zero, so the panel never shows "0 tools" for a
 * populated category). The category pages themselves use their own
 * static data source and stay correct.
 *
 * If truly live counts become critical, two options:
 *  1. Wrap this component in <Suspense> + a client-side fetch.
 *  2. Add `export const revalidate = 60` to the layout to opt into
 *     ISR. Whole-page revalidation is cheap on Cloudflare's edge
 *     but invalidates the full static HTML.
 */
import { getHeaderToolsData } from "@/lib/d1/header-tools";
import { ClientHeaderShell } from "./client-header-shell";

export default async function ClientHeader() {
  const data = await getHeaderToolsData();
  return <ClientHeaderShell categories={data.categories} />;
}
