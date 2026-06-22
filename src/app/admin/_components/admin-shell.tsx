"use client";

/**
 * Admin shell — sidebar + header. Wraps every /admin/* page.
 *
 * Two auth states:
 *   - Unauthenticated (no session cookie, or session invalid): render
 *     only the children with a top bar that says "Widgetly Admin" and
 *     a "Sign in" link. This is what /admin/sign-in sees.
 *   - Authenticated: render the full sidebar + top bar with user info
 *     and a sign-out button.
 *
 * Detection runs in a useEffect (so we don't try to read cookies()
 * during SSR — those are HttpOnly and not in the document). The first
 * render shows the minimal shell; after /api/admin/auth/me returns
 * we either stay minimal (401) or swap in the full chrome (200).
 *
 * Tablet + mobile: the sidebar becomes a slide-in panel triggered by
 * a hamburger button. Backdrop click closes it. The route change
 * effect also closes it so navigation doesn't leave the menu open.
 */
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  KeyRound,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/tools", label: "Tools", icon: Wrench },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSignIn = pathname === "/admin/sign-in";

  const [auth, setAuth] = React.useState<
    | { state: "loading" }
    | { state: "anon" }
    | { state: "authed"; user: { id: number; username: string; display_name: string } }
  >({ state: "loading" });

  // Probe /me on mount and whenever the route changes (so a fresh
  // sign-in on /admin/sign-in immediately upgrades the shell).
  React.useEffect(() => {
    if (isSignIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuth({ state: "anon" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/auth/me", { cache: "no-store" });
        if (cancelled) return;
        if (r.ok) {
          const { user } = (await r.json()) as {
            user: { id: number; username: string; display_name: string };
          };
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAuth({ state: "authed", user });
        } else {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAuth({ state: "anon" });
        }
      } catch {
        if (!cancelled) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAuth({ state: "anon" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, isSignIn]);

  // If we're on a protected page and the probe says anon, redirect.
  React.useEffect(() => {
    if (auth.state === "anon" && !isSignIn) {
      router.replace(`/admin/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [auth.state, isSignIn, pathname, router]);

  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/sign-in");
  }

  // Sign-in page: minimal chrome only.
  if (isSignIn) {
    return (
      <div className="bg-background text-foreground min-h-dvh">
        <header className="border-border/60 border-b">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-6">
            <ShieldCheck className="text-primary h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight">Widgetly Admin</span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  // Loading + anon: render children but show the minimal shell. The
  // child route (e.g. /admin) handles its own data fetching, which
  // will 401 if the cookie is bad; we also redirect via the effect above.
  if (auth.state !== "authed") {
    return (
      <div className="bg-background text-foreground min-h-dvh">
        <header className="border-border/60 border-b">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight">Widgetly Admin</span>
            </div>
            {auth.state === "anon" ? (
              <Link
                href="/admin/sign-in"
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Sign in
              </Link>
            ) : (
              <RefreshCw
                className="text-muted-foreground h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  // Authed: full sidebar + top bar (responsive).
  return (
    <AuthedShell pathname={pathname} auth={auth} signOut={signOut}>
      {children}
    </AuthedShell>
  );
}

function AuthedShell({
  pathname,
  auth,
  signOut,
  children,
}: {
  pathname: string;
  auth: { state: "authed"; user: { id: number; username: string; display_name: string } };
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Close the mobile sidebar on route change.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  const user = auth.user;

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="flex min-h-dvh">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-stone-900/40 backdrop-blur-sm lg:hidden"
          />
        )}

        <aside
          className={cn(
            "border-border/60 w-60 shrink-0 border-r bg-white lg:flex lg:flex-col",
            // Off-canvas by default below lg; slide in when open
            sidebarOpen ? "fixed inset-y-0 left-0 z-30 flex flex-col" : "hidden lg:flex"
          )}
        >
          <div className="flex h-14 items-center justify-between gap-2 border-b px-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight">Widgetly Admin</span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground -mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/5 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-border/60 border-t p-3 text-xs text-stone-500">
            <Boxes className="text-muted-foreground mx-auto mb-2 h-5 w-5" aria-hidden="true" />
            <p className="text-center leading-relaxed">
              Manage tools, statuses, and the public menu from one place.
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-border/60 sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white/80 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white/60 transition-colors lg:hidden"
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="text-muted-foreground text-sm">
                {pathname === "/admin" ? "Dashboard" : pathname.replace(/^\/admin\/?/, "")}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-muted-foreground hidden text-xs sm:inline">
                Signed in as{" "}
                <span className="text-foreground font-medium">
                  {user.display_name || user.username}
                </span>
              </span>
              <Link
                href="/admin/account/password"
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
                aria-label="Change password"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Change password</span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
