"use client";

import * as React from "react";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";
import { useConsent } from "@/lib/consent/useConsent";
import { ConsentPreferencesModal } from "./ConsentPreferencesModal";

/**
 * Footer link that opens the cookie preferences modal.
 *
 * If the user has never given consent (the banner is still pending),
 * we forward to a tiny "preferences" landing that opens the modal
 * instead of just showing a blank state. If they have, we open
 * the modal directly with their current choices pre-loaded.
 */
export function CookiePreferencesLink({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("consent");
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-white"
        }
      >
        <Cookie aria-hidden="true" className="h-3.5 w-3.5" />
        {children ?? t("footerLink")}
      </button>
      <ConsentPreferencesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Resets the persisted consent so the banner re-appears on next
 * render. Wired to the footer's "Reset cookie preferences" action.
 * Kept separate from the link so the link can be SSR-stable.
 */
export function ResetConsentButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("consent");
  const consent = useConsent();
  return (
    <button
      type="button"
      onClick={() => consent.reset()}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-white"
      }
    >
      {children ?? t("footerReset")}
    </button>
  );
}
