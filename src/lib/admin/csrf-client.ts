"use client";

/**
 * Client-side CSRF helper.
 *
 * The server sets a non-HttpOnly cookie (`wly_admin_csrf`) on sign-in
 * containing a random token. For every state-changing fetch, the
 * client must echo that same token in the `x-csrf-token` header. The
 * server validates the header against the cookie with constant-time
 * comparison before letting the request through.
 *
 * Why belt-and-suspenders: the session cookie is already
 * SameSite=Strict, which browsers treat as "never include on
 * cross-site requests." That alone blocks the classic CSRF attack.
 * Adding the token check is defense-in-depth: if a future browser
 * bug or SameSite quirk ever leaks the cookie, the attacker still
 * can't forge the header (they can't read the non-HttpOnly cookie
 * cross-origin).
 */
const COOKIE_NAME = "wly_admin_csrf";
const HEADER_NAME = "x-csrf-token";

/** Read the CSRF cookie value. Returns null if absent. */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

/**
 * Wrap a fetch call so the CSRF header is added on state-changing
 * methods (POST, PATCH, PUT, DELETE). GET/HEAD/OPTIONS are passed
 * through unchanged.
 */
export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      init.headers = {
        ...(init.headers as Record<string, string> | undefined),
        [HEADER_NAME]: token,
      };
    }
  }
  return fetch(input, init);
}

export const CSRF_HEADER = HEADER_NAME;
