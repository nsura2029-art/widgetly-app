/**
 * Root layout — minimal pass-through. The real layout (html lang/dir,
 * chrome, providers) lives at `app/[locale]/layout.tsx`.
 *
 * We keep this file so Next.js has a root to mount under, but it
 * intentionally does NOT set `<html>` or `<body>` — those are owned
 * by the [locale] layout so we can set the right lang/dir per request.
 *
 * The `globals.css` import lives here so it ships with the initial
 * bundle regardless of locale.
 */
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
