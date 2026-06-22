/**
 * /admin/reset-password?token=...
 *
 * Reset-password page reached via the link from /admin/forgot-password.
 * Token is in the query string; the page shows a new-password form.
 * On success, the user is signed in (session cookie is set) and
 * redirected to /admin.
 */
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
