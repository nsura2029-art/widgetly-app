import Link from "next/link";

export const metadata = {
  title: "Page Not Found | Widgetly",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return (
    <>
      <main className="container flex min-h-[60vh] items-center justify-center py-20 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            404
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Page not found
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
            Head back to the homepage to explore Widgetly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-md bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
            >
              Back to home
            </Link>
            <Link
              href="/blog"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Read the blog
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
