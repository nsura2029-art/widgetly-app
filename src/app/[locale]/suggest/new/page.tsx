import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import { buildMetadata } from "@/lib/seo";
import { SuggestionForm } from "./suggestion-form";

export const metadata: Metadata = buildMetadata({
  title: "Submit a Tool Suggestion",
  description:
    "Suggest a new Widgetly tool, explain the use case, and get a shareable community voting link.",
  path: "/suggest/new",
});

export default function NewSuggestionPage() {
  return (
    <PageShell width="wide">
      <div className="mx-auto max-w-3xl">
        <span className="border-primary/20 bg-primary/10 text-primary inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          New suggestion
        </span>
        <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight">
          Tell us what to build next
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-base leading-relaxed">
          Share the tool name, the problem it solves, and where it fits. Approved suggestions get a
          public page that the community can upvote.
        </p>
        <SuggestionForm />
      </div>
    </PageShell>
  );
}
