"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useConsent } from "@/lib/consent/useConsent";

/**
 * Preferences modal — opened from the banner's "Customize" button
 * or from the footer's "Cookie preferences" link.
 *
 * Three categories:
 *  - Essential: always on, toggle disabled.
 *  - Analytics: opt-in. Default off in GDPR/CCPA regions.
 *  - Advertising: opt-in. Default off in GDPR/CCPA regions.
 *
 * "Save preferences" persists the selection; "Accept all" is a
 * shortcut for analytics+advertising on. Closing without saving
 * (Esc, backdrop click, the X) leaves the stored record unchanged.
 */
export function ConsentPreferencesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("consent");
  const consent = useConsent();

  // Local draft of the toggles. We don't write to the store until
  // the user clicks "Save" — letting them back out without changing
  // the persisted record.
  const [analytics, setAnalytics] = React.useState(consent.state?.analytics ?? false);
  const [advertising, setAdvertising] = React.useState(consent.state?.advertising ?? false);

  // When the modal opens, reset the draft from the persisted state
  // (or from the region-aware defaults if nothing's stored yet).
  // setState in effect is the documented pattern for "reset local
  // draft state when the controlled value changes" — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  React.useEffect(() => {
    if (!open) return;
    if (consent.state) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalytics(consent.state.analytics);

      setAdvertising(consent.state.advertising);
    } else {
      // No decision yet. In GDPR/CCPA we default both toggles OFF
      // (opt-in model). Elsewhere we still default OFF to match
      // the banner's "Reject All" baseline — the user has to
      // explicitly opt in to either.

      setAnalytics(false);

      setAdvertising(false);
    }
  }, [open, consent.state]);

  // Esc to close, body scroll lock while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    consent.save({ analytics, advertising });
    onClose();
  };
  const acceptAll = () => {
    consent.acceptAll();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-background border-border/80 relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl">
        <h2
          id="consent-modal-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {t("modal.title")}
        </h2>
        <p className="text-muted mt-1 text-sm leading-relaxed">{t("modal.body")}</p>

        <div className="mt-5 space-y-3">
          <ConsentRow
            label={t("categories.essential.label")}
            description={t("categories.essential.description")}
            checked
            disabled
            onChange={() => {}}
          />
          <ConsentRow
            label={t("categories.analytics.label")}
            description={t("categories.analytics.description")}
            checked={analytics}
            onChange={setAnalytics}
          />
          <ConsentRow
            label={t("categories.advertising.label")}
            description={t("categories.advertising.description")}
            checked={advertising}
            onChange={setAdvertising}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={acceptAll}
            className="text-muted hover:text-foreground inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-medium transition-colors sm:order-1"
          >
            {t("modal.acceptAll")}
          </button>
          <button
            type="button"
            onClick={save}
            className="bg-foreground text-background inline-flex h-9 items-center justify-center rounded-lg px-5 text-xs font-semibold transition-opacity hover:opacity-90 sm:order-2"
          >
            {t("modal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="border-border/60 bg-muted/5 flex items-start gap-3 rounded-xl border p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-semibold">{label}</p>
        <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors " +
          (disabled
            ? "bg-foreground/80 cursor-not-allowed"
            : checked
              ? "bg-foreground"
              : "bg-foreground/20")
        }
      >
        <span
          className={
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
            (checked ? "translate-x-[18px]" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}
