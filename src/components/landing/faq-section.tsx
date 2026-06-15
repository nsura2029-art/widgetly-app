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
    })),
  );

  return (
    <section
      id="faq"
      className="relative border-t border-border/60 py-12 sm:py-16 lg:py-20"
      aria-labelledby="faq-title"
    >
      <div className="container">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border/80 bg-white px-3 py-1 text-xs font-medium text-muted shadow-soft">
            {t("pill")}
          </span>
          <h2
            id="faq-title"
            className="mt-4 text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            {t("subtitle")}
          </p>
        </FadeIn>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/60 bg-white shadow-soft">
          {items.map((item) => (
            <details
              key={item.key}
              className="group p-6 [&[open]]:bg-muted/5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-foreground marker:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border/80 text-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
