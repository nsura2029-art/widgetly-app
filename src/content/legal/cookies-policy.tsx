import React from "react";

export const lastUpdated = "2026-06-13";

export const PLAIN_ENGLISH =
  "We use a small number of cookies to keep you signed in and to understand which tools people use. We don't run third-party advertising cookies. You can clear or block cookies in your browser settings at any time — most of the site will still work, you'll just be signed out.";

export default function CookiesContent() {
  return (
    <>
      <h2 id="what-are-cookies">1. What Are Cookies</h2>
      <p>
        Cookies are small text files that websites store on your device when you visit them. They
        let the site remember your actions and preferences for a period of time, so you don&apos;t
        have to re-enter them every time you visit. We also use a small number of related
        technologies (local storage, session storage) that work the same way. When we say
        &ldquo;cookies&rdquo; in this policy, we mean all of them.
      </p>

      <h2 id="cookies-we-use">2. Cookies We Use</h2>
      <p>
        We try to keep this list short. Here&apos;s every cookie we set, why, and how long it lasts.
      </p>

      <div className="not-prose border-border/60 my-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/5 text-muted text-xs tracking-wider uppercase">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Purpose</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-border/60 divide-y">
            <tr>
              <td className="px-4 py-3 font-mono text-xs">widgetly_session</td>
              <td className="px-4 py-3">Keeps you signed in across page loads.</td>
              <td className="text-muted px-4 py-3">Essential</td>
              <td className="text-muted px-4 py-3">Session</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono text-xs">widgetly_pref</td>
              <td className="px-4 py-3">Remembers your UI preferences (theme, layout density).</td>
              <td className="text-muted px-4 py-3">Functional</td>
              <td className="text-muted px-4 py-3">1 year</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono text-xs">widgetly_csrf</td>
              <td className="px-4 py-3">
                Prevents cross-site request forgery on form submissions.
              </td>
              <td className="text-muted px-4 py-3">Essential</td>
              <td className="text-muted px-4 py-3">Session</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono text-xs">ph_*</td>
              <td className="px-4 py-3">
                Product analytics (page views, feature usage). Set by our analytics provider; we use
                this to understand which tools work.
              </td>
              <td className="text-muted px-4 py-3">Analytics</td>
              <td className="text-muted px-4 py-3">Up to 13 months</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-mono text-xs">cf_clearance</td>
              <td className="px-4 py-3">
                Cloudflare security cookie. Confirms you passed a bot / abuse challenge so we
                don&apos;t challenge you on every page.
              </td>
              <td className="text-muted px-4 py-3">Essential</td>
              <td className="text-muted px-4 py-3">30 days</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="types-of-cookies">3. Types of Cookies</h2>
      <p>
        We classify every cookie we set into one of four categories. The list above is grouped
        accordingly.
      </p>
      <ul>
        <li>
          <strong>Essential</strong> — required for the Service to work. The site can&apos;t
          function without these (for example, the session cookie that keeps you signed in).
        </li>
        <li>
          <strong>Functional</strong> — remember choices you make, like your theme preference.
          Disabling them doesn&apos;t break the site, but you&apos;ll lose the remembered
          preferences.
        </li>
        <li>
          <strong>Analytics</strong> — help us understand which features people use. We use this
          data in aggregate, never to identify individual users.
        </li>
        <li>
          <strong>Advertising</strong> — we don&apos;t use these. We don&apos;t run ad networks,
          retargeting pixels, or third-party advertising trackers on Widgetly.
        </li>
      </ul>

      <h2 id="third-party">4. Third-Party Cookies</h2>
      <p>
        A small number of third-party services set their own cookies when you use the Service.
        We&apos;ve vetted these providers and limited what they can do:
      </p>
      <ul>
        <li>
          <strong>Cloudflare</strong> sets the <code>cf_clearance</code> cookie as described above.
        </li>
        <li>
          <strong>PostHog</strong> sets analytics cookies (<code>ph_*</code>) to track page views
          and feature usage. PostHog is configured to truncate IP addresses and to disable
          cross-site tracking.
        </li>
      </ul>
      <p>
        Tools that load third-party content (for example, an embedded video) may set additional
        cookies controlled by those third parties. We link out to these services from their own UI
        rather than embedding them where we can.
      </p>

      <h2 id="managing">5. Managing Cookies</h2>
      <p>
        You can clear or block cookies through your browser settings. The exact steps depend on your
        browser; here are links to the guides for the most common ones:
      </p>
      <ul>
        <li>
          <a href="https://support.google.com/chrome/answer/95647" rel="noopener noreferrer">
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>
      <p>
        Blocking essential cookies will sign you out and may break some features. The rest of the
        site will continue to work.
      </p>

      <h2 id="do-not-track">6. Do Not Track</h2>
      <p>
        We honor the <em>Do Not Track</em> and <em>Global Privacy Control</em> browser signals where
        they are technically supported by our analytics provider. When we receive one of these
        signals, we do not set the analytics cookies listed above.
      </p>

      <h2 id="updates">7. Updates to This Policy</h2>
      <p>
        We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top
        of the page reflects the most recent change. For material changes — for example, adding a
        new cookie category — we&apos;ll show a notice on the site.
      </p>

      <h2 id="contact">8. Contact</h2>
      <p>
        Questions about cookies? Write to{" "}
        <a href="mailto:privacy@widgetly.app">privacy@widgetly.app</a>.
      </p>
    </>
  );
}
