"use client";

import * as React from "react";
import { Cookie, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useConsent } from "@/lib/consent/useConsent";
import { ConsentPreferencesModal } from "./ConsentPreferencesModal";

/**
 * The cookie consent banner.
 *
 * Behavior:
 *  - Hidden until the provider has hydrated (no banner flash on
 *    pages that already have a stored consent).
 *  - Hidden once the user has given a current-version answer.
 *  - Re-appears if the user resets their preferences (e.g. via the
 *    footer's "Cookie preferences" link).
 *  - Three primary actions: Accept All, Reject All, Customize.
 *  - "Customize" opens the preferences modal; saving it also
 *    dismisses the banner.
 *
 * Visual: a fixed bottom card on mobile (full-width), a
 * bottom-right card on `sm:`. z-40 keeps it above page content
 * (which uses z-0..z-20) and below the header (z-50).
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const consent = useConsent();
  const [modalOpen, setModalOpen] = React.useState(false);

  if (!consent.ready || consent.decided) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-banner-title"
        aria-describedby="consent-banner-desc"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:right-4 sm:bottom-4 sm:left-auto sm:w-[min(28rem,calc(100vw-2rem))] sm:px-0 sm:pb-0"
      >
        <div className="bg-background border-border/80 rounded-2xl border p-5 shadow-2xl ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="bg-muted text-foreground shrink-0 rounded-full p-2">
              <Cookie aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="consent-banner-title"
                className="text-foreground text-sm font-semibold tracking-tight"
              >
                {t("banner.title")}
              </h2>
              <p id="consent-banner-desc" className="text-muted mt-1 text-xs leading-relaxed">
                {t("banner.body")}{" "}
                <Link
                  href="/cookies-policy"
                  className="text-foreground underline underline-offset-2 hover:no-underline"
                >
                  {t("banner.learnMore")}
                </Link>
                .
              </p>
            </div>
            <button
              type="button"
              aria-label={t("banner.dismiss")}
              className="text-muted hover:text-foreground shrink-0 rounded-md p-1"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => consent.acceptAll()}
              className="bg-foreground text-background inline-flex h-9 flex-1 items-center justify-center rounded-lg px-4 text-xs font-semibold transition-opacity hover:opacity-90 sm:flex-none"
            >
              {t("banner.acceptAll")}
            </button>
            <button
              type="button"
              onClick={() => consent.rejectAll()}
              className="border-border text-foreground hover:bg-muted/40 inline-flex h-9 flex-1 items-center justify-center rounded-lg border px-4 text-xs font-semibold transition-colors sm:flex-none"
            >
              {t("banner.rejectAll")}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-muted hover:text-foreground inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors sm:flex-none"
            >
              {t("banner.customize")}
            </button>
          </div>
        </div>
      </div>

      <ConsentPreferencesModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
