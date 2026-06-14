import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Page Not Found | Widgetly",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return (
    <PageShell width="narrow">
      <div className="text-center">
        <p className="text-primary text-xs font-semibold tracking-wider uppercase">404</p>
        <h1 className="text-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-md text-base">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Head back to the
          homepage to explore Widgetly.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="bg-brand-gradient rounded-md px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to home
          </Link>
          <Link
            href="/blog"
            className="border-border rounded-md border px-5 py-2.5 text-sm font-semibold"
          >
            Read the blog
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
