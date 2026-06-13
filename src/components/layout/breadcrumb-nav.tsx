"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Breadcrumb } from "./breadcrumb";
import type { Crumb } from "@/lib/breadcrumbs";

/**
 * Page-level breadcrumb config. Pages can push overrides into a module-level
 * store (read by `<BreadcrumbNav />`) without needing a context provider
 * threaded through the layout. Push happens in a small client component
 * that mounts alongside the page and tears down on navigation.
 *
 * The store is keyed by the current pathname so navigating between dynamic
 * routes (e.g. blog post → blog post) refreshes the label.
 */

export type BreadcrumbConfigValue = {
  /** Per-segment label overrides. */
  customLabels?: Record<string, string>;
  /** Replace the entire crumb trail. */
  items?: Crumb[];
  /** Suppress the global breadcrumb on this page. */
  hidden?: boolean;
  /** Drop the leading "Home" crumb. */
  hideHome?: boolean;
  /** Suppress only the JSON-LD script (page emits its own). */
  suppressSchema?: boolean;
};

type Entry = BreadcrumbConfigValue & { key: number };
const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
let counter = 0;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getEntry(path: string): Entry | undefined {
  return store.get(path);
}

/**
 * Push a breadcrumb config for the current path. Mount this anywhere
 * in the page tree; it self-cleans on unmount.
 */
export function BreadcrumbConfig(props: BreadcrumbConfigValue) {
  const pathname = usePathname() ?? "/";
  const keyRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const key = ++counter;
    keyRef.current = key;
    store.set(pathname, { ...props, key });
    listeners.forEach((l) => l());
    return () => {
      // Only clear if we're still the most-recent entry for this path.
      const current = store.get(pathname);
      if (current && current.key === key) {
        store.delete(pathname);
        listeners.forEach((l) => l());
      }
    };
    // We intentionally re-run on every render of props/pathname so pages
    // can compute labels from data fetched during render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, JSON.stringify(props)]);

  return null;
}

/**
 * Client-side breadcrumb nav: reads the current pathname, merges any
 * per-page config pushed via `<BreadcrumbConfig />`, and renders the
 * server-renderable `<Breadcrumb />`.
 */
export function BreadcrumbNav() {
  const pathname = usePathname() ?? "/";
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    return subscribe(force);
  }, []);

  // Homepage → no breadcrumb.
  if (pathname === "/") return null;

  const config = getEntry(pathname);
  if (config?.hidden) return null;

  return (
    <Breadcrumb
      path={pathname}
      customLabels={config?.customLabels}
      items={config?.items}
      hideHome={config?.hideHome}
      withSchema={config?.suppressSchema ? false : true}
    />
  );
}
