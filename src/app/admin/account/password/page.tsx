/**
 * /admin/account/password
 *
 * Change-password page. Two modes:
 *   - First-time forced change: sign-in route redirects here if
 *     must_change_password=1. Banner says "Set a new password to
 *     continue." After success, router.replace to ?next= or /admin.
 *   - Voluntary change: regular navigation from the admin chrome
 *     "Change password" link. Same form, different banner.
 *
 * Auth required. If unauthenticated, the admin-shell kicks a
 * redirect to /admin/sign-in (same as any other admin page).
 */
import { Suspense } from "react";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordForm />
    </Suspense>
  );
}
