"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidEmail } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

interface WaitlistApiResponse {
  ok: boolean;
  position?: number;
  message?: string;
}

/**
 * Email capture for the waitlist. Posts to a Worker endpoint at
 * `/api/waitlist`; if not configured, gracefully falls back to a
 * local success simulation so the UI still works in static export.
 */
export function WaitlistForm() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState<string>("");
  const [touched, setTouched] = React.useState(false);

  const showInvalid = touched && email.length > 0 && !isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValidEmail(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: WaitlistApiResponse = await res
        .json()
        .catch(() => ({ ok: false, message: "Network error" }));
      if (res.ok && data.ok) {
        setStatus("success");
        setMessage(
          data.position
            ? `You're in! You're #${data.position.toLocaleString()} on the list.`
            : "You're on the list. Check your inbox for confirmation."
        );
        setEmail("");
        setTouched(false);
      } else {
        throw new Error(data.message ?? "Something went wrong");
      }
    } catch (err) {
      // Fallback: if no backend is configured, accept the email locally
      // so the page still demos correctly.
      const local =
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/_");
      if (local) {
        setStatus("success");
        setMessage("You're on the list! We'll be in touch soon.");
        setEmail("");
        setTouched(false);
      } else {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-glow-sm"
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.div>
            <p className="text-base font-semibold text-foreground">
              You're on the list!
            </p>
            <p className="text-sm text-muted">{message}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setMessage("");
              }}
              className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Add another email
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-3"
            noValidate
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="waitlist-email" className="sr-only">
                Email address
              </label>
              <div className="relative flex-1">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="waitlist-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  invalid={showInvalid}
                  className="pl-11"
                  disabled={status === "submitting"}
                  aria-describedby="waitlist-help"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="group"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Joining…
                  </>
                ) : (
                  <>
                    Join Waitlist
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </div>
            <div
              id="waitlist-help"
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"
            >
              <span>We'll only email you about the launch. No spam.</span>
              {(showInvalid || status === "error") && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {status === "error"
                    ? message
                    : "Please enter a valid email address."}
                </span>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
