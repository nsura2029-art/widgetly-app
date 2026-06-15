import React from "react";

export const lastUpdated = "2026-06-13";

export const PLAIN_ENGLISH =
  "We collect the minimum data we need to run Widgetly — mostly the things you give us, like an email if you join the waitlist. We don't sell your data. We don't run third-party trackers on pages that handle your files. You can ask for everything we have on you, and you can ask us to delete it.";

export default function PrivacyPolicyContent() {
  return (
    <>
      <h2 id="introduction">1. Introduction</h2>
      <p>
        Widgetly (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the website at{" "}
        <a href="https://widgetly.app">widgetly.app</a> and the related tools, applications, and
        services (together, the &ldquo;Service&rdquo;). This Privacy Policy explains what
        information we collect, how we use it, who we share it with, and the choices you have.
      </p>
      <p>
        We&apos;ve written this in plain language where we can, and we&apos;ve added a thirty-second
        summary at the top of the page for anyone who just wants the gist. If anything is unclear,
        write to us at <a href="mailto:privacy@widgetly.app">privacy@widgetly.app</a> and we&apos;ll
        explain.
      </p>

      <h2 id="information-we-collect">2. Information We Collect</h2>
      <p>
        We collect information in three ways: things you give us, things we see when you use the
        Service, and a small amount from service providers we work with.
      </p>

      <h3 id="info-you-give">Information you give us</h3>
      <ul>
        <li>
          <strong>Account information.</strong> If you sign in, we store your email address and a
          hashed password (we never store passwords in plain text).
        </li>
        <li>
          <strong>Waitlist and contact-form submissions.</strong> Your name, email, and any message
          you write to us.
        </li>
        <li>
          <strong>Tool suggestions.</strong> The tool name, description, and category you submit
          through the Suggest page.
        </li>
        <li>
          <strong>Feedback.</strong> Anything you send us by email, via the contact form, or through
          our GitHub issues.
        </li>
      </ul>

      <h3 id="info-automatically">Information we collect automatically</h3>
      <ul>
        <li>
          <strong>Usage data.</strong> Which pages you visit, which tools you use, and the order in
          which you use them. We use this to understand which features work and which ones
          don&apos;t.
        </li>
        <li>
          <strong>Device data.</strong> Browser type, operating system, screen size, and the general
          region you&apos;re connecting from (country or region, not your exact location unless you
          opt in).
        </li>
        <li>
          <strong>Log data.</strong> Standard server logs — IP address, request path, response code,
          user agent, and timestamp. We keep these for up to 30 days for security and debugging,
          then we aggregate or delete them.
        </li>
      </ul>

      <h3 id="info-from-providers">Information from service providers</h3>
      <p>
        We use a small number of third-party services to run the Service. These providers may
        process limited data on our behalf. They&apos;re listed in the
        <em> Third-Party Services</em> section below.
      </p>

      <h2 id="how-we-use-information">3. How We Use Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Operate, maintain, and improve the Service.</li>
        <li>Respond to your messages and support requests.</li>
        <li>Send you essential service updates (security incidents, breaking changes).</li>
        <li>
          Send you product updates <em>only if you opt in</em>. We don&apos;t add you to a marketing
          list by default.
        </li>
        <li>Detect and prevent abuse, fraud, and security incidents.</li>
        <li>Comply with legal obligations and respond to lawful requests.</li>
      </ul>
      <p>
        We do <strong>not</strong> use your data for automated profiling, advertising, or to make
        decisions that affect you in a legal or similarly significant way.
      </p>

      <h2 id="data-storage">4. Data Storage &amp; Security</h2>
      <p>
        Most of the tools on Widgetly run entirely in your browser. When you merge a PDF, format
        some JSON, or generate a color palette, the file never leaves your device. We don&apos;t see
        it, we don&apos;t store it, and we couldn&apos;t hand it over to anyone even if we wanted
        to.
      </p>
      <p>
        For the small number of tools that need server processing (for example, our AI tools that
        call a language model), your input is encrypted in transit with TLS 1.3, processed once, and
        not stored. We retain server logs for 30 days for security and abuse prevention.
      </p>
      <p>
        Account data and form submissions are stored in encrypted databases hosted on
        Cloudflare&apos;s infrastructure. Access is restricted to a small number of team members
        with multi-factor authentication.
      </p>

      <h2 id="third-party-services">5. Third-Party Services</h2>
      <p>
        We use a small, vetted set of third-party providers to run the Service. The current list:
      </p>
      <ul>
        <li>
          <strong>Cloudflare</strong> — hosting, edge network, and DDoS protection. Privacy policy:{" "}
          <a href="https://www.cloudflare.com/privacypolicy/">cloudflare.com/privacypolicy</a>.
        </li>
        <li>
          <strong>PostHog (or similar product analytics)</strong> — privacy-respecting product
          analytics. IP addresses are truncated before storage; we don&apos;t track you across other
          sites.
        </li>
        <li>
          <strong>Email provider</strong> — to send waitlist confirmations and replies to your
          messages. We never share your email with third parties for marketing.
        </li>
      </ul>
      <p>
        We don&apos;t use third-party advertising trackers on Widgetly. Pages that handle your files
        load zero third-party scripts by default.
      </p>

      <h2 id="your-rights">6. Your Rights &amp; Choices</h2>
      <p>
        Depending on where you live, you may have some or all of the following rights over the
        personal data we hold about you:
      </p>
      <ul>
        <li>
          <strong>Access</strong> — ask for a copy of the data we hold about you.
        </li>
        <li>
          <strong>Correction</strong> — ask us to fix data that&apos;s wrong or incomplete.
        </li>
        <li>
          <strong>Deletion</strong> — ask us to delete your data. We&apos;ll do this within 30 days,
          except where we&apos;re required to keep it (for example, transaction records for tax
          purposes).
        </li>
        <li>
          <strong>Portability</strong> — ask for a machine-readable export of your data.
        </li>
        <li>
          <strong>Objection / restriction</strong> — ask us to stop certain kinds of processing.
        </li>
        <li>
          <strong>Withdraw consent</strong> — where we rely on consent, you can withdraw it at any
          time.
        </li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:privacy@widgetly.app">privacy@widgetly.app</a>. We respond within 30 days,
        usually much faster.
      </p>

      <h2 id="international-transfers">7. International Data Transfers</h2>
      <p>
        Widgetly is a small, remote-first team. Your data may be processed in the United States or
        the European Union, depending on which of our infrastructure providers is closer to you.
        Where we transfer data across borders, we rely on standard contractual clauses and the
        safeguards our providers already have in place.
      </p>
      <p>
        If you&apos;re in the EEA, the UK, or Switzerland, our legal basis for processing is one of:
        your consent, the performance of a contract with you, our legitimate interests in running
        the Service (where these don&apos;t override your rights), or compliance with a legal
        obligation.
      </p>

      <h2 id="children">8. Children&apos;s Privacy</h2>
      <p>
        The Service is not directed to children under 13, and we don&apos;t knowingly collect
        personal information from children under 13. If you believe a child under 13 has given us
        personal information, please contact{" "}
        <a href="mailto:privacy@widgetly.app">privacy@widgetly.app</a> and we&apos;ll delete it.
      </p>

      <h2 id="changes">9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. When we do, we&apos;ll change the &ldquo;Last
        updated&rdquo; date at the top of the page and, for material changes, give you reasonable
        notice (for example, a banner on the site or an email if you have an account).
      </p>

      <h2 id="contact">10. Contact</h2>
      <p>
        For privacy questions, data requests, or anything else, write to{" "}
        <a href="mailto:privacy@widgetly.app">privacy@widgetly.app</a>. We&apos;re a small team and
        we read every message.
      </p>
    </>
  );
}
