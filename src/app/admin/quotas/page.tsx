import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getQuotaSettings } from "@/lib/quota/server";
import { QuotaSettingsForm } from "./_components/quota-settings-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quota settings",
  description: "Per-actor daily page limits for the conversion quota system.",
};

export default async function AdminQuotasPage() {
  const t = await getTranslations("adminQuotas");
  const settings = await getQuotaSettings();
  return (
    <>
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>
      <QuotaSettingsForm
        initial={settings}
        labels={{
          anonymous: t("anonymous"),
          registered: t("registered"),
          pagesPer24h: t("pagesPer24h"),
          save: t("save"),
          saved: t("saved"),
          currentUsage: t("currentUsage"),
          error: t("error"),
        }}
      />
    </>
  );
}
