"use client";

/**
 * Last-resort error boundary for the [locale] segment.
 *
 * Why this file exists and why it's "use client" + self-renders
 * <html>/<body>:
 *   - Next.js renders global-error.tsx in place of the entire root
 *     layout, not just the failing page. So the parent <html> and
 *     <body> tags from [locale]/layout.tsx are GONE and we have to
 *     provide them here.
 *   - The next-intl provider lives in the broken tree, so we can't
 *     call useTranslations() here. Strings are inlined per locale
 *     and the locale is detected from the current pathname prefix.
 *   - We must NOT throw from this component — that would re-trigger
 *     the same error and infinite-loop the error shell.
 *   - Inline styles only, no CSS class dependency, so this still
 *     renders usefully even if the stylesheet pipeline is the
 *     thing that broke.
 *
 * Triggered by: errors that escape every other error boundary,
 * INCLUDING errors that originate inside [locale]/layout.tsx (where
 * a normal `error.tsx` boundary can't help us). For component-level
 * crashes inside page trees (the common case), a sibling
 * `error.tsx` is more useful — this file is the absolute last
 * line of defense.
 *
 * Replaces the empty `__next_error__` shell that hid the original
 * mascot-regression cause.
 */

import { usePathname } from "next/navigation";

type Locale = "en" | "es" | "fr";

const STRINGS: Record<
  Locale,
  {
    status: string;
    title: string;
    body: string;
    digestLabel: string;
    reload: string;
    home: string;
  }
> = {
  en: {
    status: "500",
    title: "Something went wrong",
    body: "An unexpected error occurred while rendering this page. Our team has been notified.",
    digestLabel: "Error ID",
    reload: "Try again",
    home: "Go to home",
  },
  es: {
    status: "500",
    title: "Algo salió mal",
    body: "Ocurrió un error inesperado al renderizar esta página. Nuestro equipo ha sido notificado.",
    digestLabel: "ID de error",
    reload: "Reintentar",
    home: "Ir al inicio",
  },
  fr: {
    status: "500",
    title: "Une erreur est survenue",
    body: "Une erreur inattendue s'est produite lors du rendu de cette page. Notre équipe a été notifiée.",
    digestLabel: "ID d'erreur",
    reload: "Réessayer",
    home: "Retour à l'accueil",
  },
};

function pickLocale(path: string | null): Locale {
  if (!path) return "en";
  const m = path.match(/^\/(en|es|fr)(?:\/|$)/);
  return (m?.[1] as Locale) ?? "en";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = pickLocale(pathname);
  const t = STRINGS[locale];

  // Minimal inline styles — no class names, no font loading, no images.
  // The whole point of this file is to be informative even when the
  // rest of the app's styling is what's broken.
  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    background: "#fafafa",
    color: "#111",
  };
  const card: React.CSSProperties = {
    maxWidth: 480,
    width: "100%",
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: "2rem",
    textAlign: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
  const statusStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.1em",
    margin: 0,
  };
  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    marginTop: 8,
    marginBottom: 8,
  };
  const bodyStyle: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.5,
    color: "#555",
    marginTop: 0,
    marginBottom: 24,
  };
  const digestStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#999",
    marginBottom: 24,
    wordBreak: "break-all",
  };
  const digestCodeStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    background: "#f3f3f3",
    padding: "2px 6px",
    borderRadius: 4,
  };
  const actionsStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
  };
  const btnPrimary: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: 8,
    background: "#111",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
  };
  const btnSecondary: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: 8,
    background: "#fff",
    color: "#111",
    fontSize: 14,
    fontWeight: 600,
    border: "1px solid #e5e5e5",
    cursor: "pointer",
    textDecoration: "none",
  };

  return (
    <html lang={locale}>
      <body>
        <main style={wrap}>
          <div style={card} role="alert" aria-live="assertive">
            <p style={statusStyle}>{t.status}</p>
            <h1 style={titleStyle}>{t.title}</h1>
            <p style={bodyStyle}>{t.body}</p>
            {error.digest ? (
              <p style={digestStyle}>
                {t.digestLabel}: <code style={digestCodeStyle}>{error.digest}</code>
              </p>
            ) : null}
            <div style={actionsStyle}>
              <button type="button" style={btnPrimary} onClick={() => reset()}>
                {t.reload}
              </button>
              <a href={`/${locale}`} style={btnSecondary}>
                {t.home}
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
