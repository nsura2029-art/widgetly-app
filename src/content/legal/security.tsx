import React from "react";

export const lastUpdated = "2026-06-19";

export const PLAIN_ENGLISH =
  "Most tools run in your browser, so your files never reach our servers. For everything else, we run on Cloudflare's edge with TLS 1.3, isolated request handlers, and auto-expiring form data. Found a bug? Tell us — we'd rather hear about it than read about it on Twitter.";

export default function SecurityContent() {
  return (
    <>
      <h2 id="browser-side">Browser-Side Processing</h2>
      <p>
        The vast majority of Widgetly tools — PDF, image, calculator, developer utilities, AI
        writers — run entirely in your browser. The file you upload or the text you paste never
        leaves your device. We can&apos;t see it, we don&apos;t store it, and there&apos;s nothing
        for an attacker to steal from our side.
      </p>

      <h2 id="auto-delete">Auto-Expiry</h2>
      <p>
        Form submissions (waitlist signups, tool suggestions, contact messages) are stored in
        Cloudflare KV with a built-in TTL and are automatically purged after 30 days. The data lives
        only as long as it&apos;s useful to us; you don&apos;t need to ask us to delete it.
      </p>

      <h2 id="scalable-edge">Scalable Edge Network</h2>
      <p>
        Widgetly runs on Cloudflare&apos;s global edge network as a Cloudflare Worker (V8 isolates),
        deployed via the OpenNext adapter. Pages render on demand at the edge, close to your
        location, and the network absorbs traffic spikes without any one user&apos;s request slowing
        down another&apos;s.
      </p>

      <h2 id="certified">Certified Infrastructure</h2>
      <p>
        Cloudflare&apos;s edge platform is certified to ISO 27001, SOC 2 Type II, and PCI DSS.
        Widgetly inherits those certifications by running on their infrastructure — we don&apos;t
        host anything on servers we operate ourselves.
      </p>

      <h2 id="isolation">Request Isolation</h2>
      <p>
        Each Worker invocation runs in its own isolated V8 isolate. There&apos;s no shared memory
        between requests, no warm-up data leak between users, and no way for one request to read
        another&apos;s state. Even our team can&apos;t access your data while it&apos;s being
        processed.
      </p>

      <h2 id="transport">Secure Communication</h2>
      <p>
        Everything between your browser and Widgetly is encrypted with TLS 1.3. We don&apos;t serve
        anything over plain HTTP. HSTS is enabled with a long max-age, so browsers refuse to
        downgrade. HTTP/3 is on at the edge.
      </p>

      <h2 id="no-signup">No Signup Required</h2>
      <p>
        You can use most Widgetly tools without an account. We don&apos;t ask for your email address
        unless you sign up for the waitlist or send us a message. We never sell, lease, or share
        your personal information with third parties for marketing or any other purpose.
      </p>

      <h2 id="gdpr">EU Data &amp; GDPR</h2>
      <p>
        Our infrastructure is hosted in the EU (Frankfurt, primary region) and is fully compliant
        with the EU General Data Protection Regulation. We apply GDPR principles to all users
        worldwide, not just EEA residents. Your data is yours — you can request export or deletion
        at any time by emailing <a href="mailto:privacy@widgetly.app">privacy@widgetly.app</a>.
      </p>

      <h2 id="session-binding">Session-Bound Storage</h2>
      <p>
        Form submissions and account preferences are bound to your locale cookie. Only your browser
        can read your session — there&apos;s no shared link, no public URL, and no way to pull up
        your data from another device unless you explicitly sign in.
      </p>

      <h2 id="disclosure">Responsible Disclosure</h2>
      <p>
        Found a vulnerability? Email{" "}
        <a href="mailto:security@widgetly.app">security@widgetly.app</a> with a description and a
        proof-of-concept. We&apos;ll acknowledge within 3 business days, work with you on a
        coordinated disclosure, and credit you (with permission) once it&apos;s resolved.
      </p>
    </>
  );
}
