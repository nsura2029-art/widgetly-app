import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/shared/fade-in";

/**
 * Server-rendered FAQ section. Two purposes:
 *   1. Provide visible Q&A content for long-tail keyword ranking.
 *   2. Pair with FAQPage JSON-LD (emitted in the layout) for rich results.
 *
 * Using <details>/<summary> means zero JS, perfect for SEO and Core Web Vitals.
 *
 * Section header comes from `home.faq.*`; Q&A pairs come from
 * `faq.items.*`. The render order is the `ORDER` constant below —
 * kept in one place so the canonical list can be iterated
 * deterministically and the keys stay aligned with en.json.
 */
const ORDER = [
  "whatIs",
  "isFree",
  "launch",
  "account",
  "privacy",
  "suggest",
  "mobile",
  "different",
] as const;

type FaqKey = (typeof ORDER)[number];

export async function FaqSection() {
  const t = await getTranslations("home.faq");
  const tItems = await getTranslations("faq.items");

  // Resolve every item up front so the render is plain JSX. We
  // deliberately use parallel awaits (one per key) rather than
  // a t.rich() call because the keys are dynamic and the static
  // order is the more important property.
  const items: { key: FaqKey; question: string; answer: string }[] = await Promise.all(
    ORDER.map(async (key) => ({
      key,
      question: await tItems(`${key}.question`),
      answer: await tItems(`${key}.answer`),
    }))
  );

  return (
    <section
      id="faq"
      className="border-border/60 relative border-t py-12 sm:py-16 lg:py-20"
      aria-labelledby="faq-title"
    >
      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="border-border/80 text-muted shadow-soft inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium">
            {t("pill")}
          </span>
          <h2
            id="faq-title"
            className="text-display-sm text-foreground sm:text-display-md mt-4 font-semibold tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="text-muted mt-4 text-base sm:text-lg">{t("subtitle")}</p>
        </FadeIn>

        <div className="divide-border/60 border-border/60 shadow-soft mx-auto mt-12 max-w-3xl divide-y rounded-2xl border bg-white">
          {items.map((item) => (
            <details key={item.key} className="group [&[open]]:bg-muted/5 p-6">
              <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold marker:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="border-border/80 text-muted grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="text-muted mt-4 text-sm leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
