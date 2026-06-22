/**
 * /admin layout — sidebar + header chrome for the admin dashboard.
 *
 * No locale prefix, no public-site chrome (the page-shell, header,
 * footer, etc. are intentionally NOT included). The admin is a
 * separate surface with its own visual identity.
 *
 * Auth is handled by /admin/sign-in/page.tsx + the auth API routes
 * (every /api/admin/* re-validates the session via
 * requireAdminFromRequest). The layout itself is a thin shell — it
 * renders whatever child route the user lands on, and lets the child
 * decide whether to redirect to /admin/sign-in.
 *
 * /admin/sign-in is the only route that DOESN'T need a session.
 */
import type { Metadata } from "next";
import { AdminShell } from "./_components/admin-shell";

export const metadata: Metadata = {
  title: { default: "Widgetly Admin", template: "%s · Widgetly Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
