/**
 * Locale-aware navigation re-exports. Components should import
 * `Link` (and any other routing primitives) from this file rather
 * than `next/link` directly. The re-exported `Link` automatically
 * prefixes the `href` with the current locale, and a `usePathname()`
 * that strips the locale prefix so paths compare as expected.
 *
 * Usage:
 *   import { Link, usePathname, useRouter } from "@/i18n/navigation";
 *
 * If you need the raw Next.js `Link` (e.g. for a fully-qualified URL
 * or one that should NOT be locale-prefixed), import directly from
 * `next/link`.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "../../next-intl.config";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
