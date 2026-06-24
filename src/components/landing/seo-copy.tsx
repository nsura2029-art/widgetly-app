import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { CATEGORIES } from "@/lib/constants";

/**
 * Long-form, indexable, server-rendered copy block.
 *
 * Purpose: give crawlers (and skim-readers) a clear topical overview of
 * Widgetly without forcing it all into the visual hero. Each category is
 * anchored with an id, an <h3>, and a paragraph that includes primary
 * long-tail keywords. This is the single biggest on-page SEO win for
 * early ranking — word count, semantic coverage, and internal links.
 */
export async function SeoCopy() {
  const t = await getTranslations("home.seo");
  const tCat = await getTranslations("categories");
  return (
    <section
      id="about-widgetly"
      className="border-border/60 relative border-t py-6 sm:py-8 lg:py-10"
      aria-labelledby="seo-explore-title"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          {/*
            Intro h2 + lead paragraphs disabled pre-launch.
            <h2
              id="seo-copy-title"
              className="text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md"
            >
              One search bar. Hundreds of tools. Built for everyone.
            </h2>

            <div className="prose prose-slate mt-6 max-w-none text-base leading-relaxed text-muted sm:text-lg">
              <p>
                {SITE_CONFIG.name} is an all-in-one AI tools platform designed to
                replace the dozens of single-purpose websites cluttering your
                bookmarks. Whether you need a quick calculator, a PDF converter,
                an AI writer, or a developer utility, {SITE_CONFIG.name} puts it
                all in one fast, private, mobile-first interface.
              </p>

              <p>
                We built {SITE_CONFIG.name} for the way people actually work in
                2025 — juggling writing, research, calculations, file
                conversions, and creative tasks across multiple devices. Instead
                of paying for ten different SaaS subscriptions or hunting through
                search results, you get one search bar that understands what you
                need and gets out of your way.
              </p>
            </div>
          */}

          <h2
            id="seo-explore-title"
            className="text-display-sm text-foreground sm:text-display-md font-semibold tracking-tight"
          >
            {t("exploreTitle")}
          </h2>
          <p className="text-muted mt-4 text-base sm:text-lg">{t("exploreSubtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:mt-20 lg:gap-8">
          {CATEGORIES.map((cat) => {
            const catName = tCat(`items.${cat.slug}.name`);
            return (
              <article
                key={cat.slug}
                id={cat.slug}
                className="border-border/60 shadow-soft rounded-2xl border bg-white p-5"
              >
                <h3 className="text-foreground text-base font-semibold tracking-tight">
                  {catName}{" "}
                  <span className="text-muted text-xs font-medium">
                    ({t("count", { count: cat.count })})
                  </span>
                </h3>
                <p className="text-muted mt-2 text-sm leading-relaxed">{cat.longDescription}</p>
                <Link
                  href={cat.href}
                  className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  aria-label={t("browse", { name: catName })}
                >
                  {t("browse", { name: catName })}
                </Link>
              </article>
            );
          })}
        </div>

        {/*
            "Who is Widgetly for?" audience breakdown disabled pre-launch.
            <h3 className="mt-14 text-xl font-semibold tracking-tight text-foreground">
              Who is Widgetly for?
            </h3>
            <div className="prose prose-slate mt-3 max-w-none text-sm leading-relaxed text-muted sm:text-base">
              <p>
                <strong className="text-foreground">Students</strong> use
                {` ${SITE_CONFIG.name} `}for citation generators, GPA
                calculators, flashcards, essay writers, and math solvers.
              </p>
              <p>
                <strong className="text-foreground">Teachers</strong> build
                lesson plans, quizzes, rubrics, and study guides in seconds with
                our AI tools.
              </p>
              <p>
                <strong className="text-foreground">Professionals</strong> rely
                on invoice generators, contract templates, PDF editors, and
                quick converters to ship work faster.
              </p>
              <p>
                <strong className="text-foreground">Creators</strong> use the
                color palette generator, QR tools, image compressors, and AI
                writing assistants to move from idea to publish in one tab.
              </p>
              <p>
                <strong className="text-foreground">Developers</strong> reach for
                the JSON formatter, regex tester, Base64 encoder, JWT decoder,
                and diff checker every single day.
              </p>
              <p>
                <strong className="text-foreground">Marketers</strong> get SEO
                meta generators, SERP previews, UTM builders, character
                counters, and link shorters without leaving the page.
              </p>
            </div>
          */}

        {/*
            "Why a coming-soon page matters" copy disabled pre-launch.
            <h3 className="mt-14 text-xl font-semibold tracking-tight text-foreground">
              Why a coming-soon page matters
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              We&apos;re launching {SITE_CONFIG.name} in stages, and we want to
              rank for the searches our future users are already running. Every
              tool category, every FAQ, and every page you can crawl today is
              part of an SEO foundation that will pay off the moment we go live.
              Join the waitlist to be the first to know when we ship.
            </p>
          */}
      </div>
    </section>
  );
}
