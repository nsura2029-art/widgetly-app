"use client";

/**
 * QuotaSettingsForm — admin form to edit anonymous + registered
 * daily page limits. PATCHes /api/admin/quotas with the changed
 * values. Each tier has its own Save button so the admin can
 * update them independently.
 */
import * as React from "react";
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { csrfFetch } from "@/lib/admin/csrf-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = {
  anonymous: { pagesPer24h: number };
  registered: { pagesPer24h: number };
};

type Labels = {
  anonymous: string;
  registered: string;
  pagesPer24h: string;
  save: string;
  saved: string;
  currentUsage: string;
  error: string;
};

export function QuotaSettingsForm({ initial, labels }: { initial: Settings; labels: Labels }) {
  const [anon, setAnon] = useState(initial.anonymous.pagesPer24h);
  const [reg, setReg] = useState(initial.registered.pagesPer24h);
  const [saving, setSaving] = useState<"anonymous" | "registered" | null>(null);
  const [savedFlag, setSavedFlag] = useState<"anonymous" | "registered" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(actor: "anonymous" | "registered") {
    setSaving(actor);
    setError(null);
    setSavedFlag(null);
    const value = actor === "anonymous" ? anon : reg;
    try {
      const r = await csrfFetch("/api/admin/quotas", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [actor]: value }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(data.message ?? data.error ?? labels.error);
        return;
      }
      setSavedFlag(actor);
      window.setTimeout(() => setSavedFlag(null), 2000);
    } catch {
      setError(labels.error);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      <TierCard
        name={labels.anonymous}
        fieldId="quota-anonymous"
        value={anon}
        onChange={setAnon}
        saving={saving === "anonymous"}
        justSaved={savedFlag === "anonymous"}
        onSave={() => save("anonymous")}
        labels={labels}
        helperText="Visitors without a Clerk account. They get a wly_anon cookie on first visit; the cookie is the actor key."
      />

      <TierCard
        name={labels.registered}
        fieldId="quota-registered"
        value={reg}
        onChange={setReg}
        saving={saving === "registered"}
        justSaved={savedFlag === "registered"}
        onSave={() => save("registered")}
        labels={labels}
        helperText="Signed-in users (Clerk). The Clerk userId is the actor key — survives across devices for the same account."
      />
    </div>
  );
}

function TierCard({
  name,
  fieldId,
  value,
  onChange,
  saving,
  justSaved,
  onSave,
  labels,
  helperText,
}: {
  name: string;
  fieldId: string;
  value: number;
  onChange: (n: number) => void;
  saving: boolean;
  justSaved: boolean;
  onSave: () => void;
  labels: Labels;
  helperText: string;
}) {
  return (
    <div className="border-border/60 shadow-soft rounded-2xl border bg-white/80 p-5 backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-foreground text-lg font-semibold">{name}</h2>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">{helperText}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex flex-col">
            <span className="text-muted-foreground text-xs font-medium">{labels.pagesPer24h}</span>
            <Input
              id={fieldId}
              type="number"
              min={0}
              max={100000}
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value);
                onChange(Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
              }}
              className="w-32 font-mono"
            />
          </label>
          <Button onClick={onSave} disabled={saving} className="self-end">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : justSaved ? (
              "✓"
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "…" : justSaved ? labels.saved : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
