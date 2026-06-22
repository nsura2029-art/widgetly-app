/**
 * /admin/forgot-password
 *
 * Username entry form for the password reset flow. No auth required.
 * On submit, POSTs to /api/admin/account/forgot-password and shows
 * the returned reset URL (if the user exists). The reset URL is
 * the entire proof of identity for the next step — until email is
 * added, the requester has to copy and open it themselves.
 */
import { Suspense } from "react";
import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
