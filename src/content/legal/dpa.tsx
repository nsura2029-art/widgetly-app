import React from "react";
import Link from "next/link";

export const lastUpdated = "2026-06-19";

export const PLAIN_ENGLISH =
  "If you're a business using Widgetly on behalf of end users (or your employees), this DPA is the contract that says: (1) you're the data controller, we're the data processor, (2) we only do what you instruct, (3) we keep your data in the EU and protect it with the controls described in our Security page, and (4) you can audit, export, or delete your data at any time.";

export default function DpaContent() {
  return (
    <>
      <h2 id="purpose">Purpose</h2>
      <p>
        This Data Processing Agreement (&quot;DPA&quot;) forms part of the Widgetly Terms of Service
        and applies when you, acting as a data controller, use Widgetly to process personal data of
        your end users, employees, or other data subjects. It satisfies the requirements of Article
        28 of the EU General Data Protection Regulation (&quot;GDPR&quot;) and equivalent provisions
        in UK GDPR, Swiss FADP, and similar laws.
      </p>
      <p>
        By using Widgetly, you instruct us to process the personal data you submit only as described
        in this DPA and the Terms of Service. If a local law requires additional terms to be
        enforceable, those terms are deemed incorporated by reference.
      </p>

      <h2 id="roles">Roles</h2>
      <ul>
        <li>
          <strong>You (the Customer)</strong> are the <em>data controller</em>. You decide what
          personal data is submitted to Widgetly and for what purpose.
        </li>
        <li>
          <strong>We (Widgetly)</strong> are the <em>data processor</em>. We process personal data
          only on your documented instructions.
        </li>
        <li>
          <strong>Sub-processors</strong> (Cloudflare, Supabase if enabled) act as further
          processors under our written agreement. A current list is maintained below.
        </li>
      </ul>

      <h2 id="scope">Scope of Processing</h2>
      <p>We process the categories of personal data that you submit, including:</p>
      <ul>
        <li>
          <strong>Account data</strong> — email address, name (if provided), authentication
          metadata.
        </li>
        <li>
          <strong>Form submission data</strong> — waitlist signups, tool suggestions, contact
          messages, and any custom text you choose to submit.
        </li>
        <li>
          <strong>Tool input data</strong> — files, text, or other content you submit to
          browser-side or server-side tools. For browser-side tools, this data never reaches our
          servers.
        </li>
        <li>
          <strong>Usage data</strong> — anonymized analytics on which tools are used and how often,
          for capacity planning and product improvement.
        </li>
      </ul>
      <p>
        Purposes are limited to: (a) providing the Widgetly service, (b) responding to your
        requests, (c) maintaining security and preventing abuse, and (d) legal compliance.
      </p>

      <h2 id="sub-processors">Sub-processors</h2>
      <p>
        We use the following sub-processors. We notify you of new sub-processors at least 30 days
        before they begin processing.
      </p>
      <ul>
        <li>
          <strong>Cloudflare, Inc.</strong> — Edge hosting, Workers runtime, KV storage, and DDoS
          protection. Data processed: account, form submission, and (for AI tools) tool input data.
          Hosting region: EU (Frankfurt, primary).
        </li>
        <li>
          <strong>Supabase, Inc.</strong> — Optional Postgres persistence for form submissions. Only
          engaged if you configure <code>SUPABASE_URL</code>. Data processed: form submission data.
          Hosting region: per your Supabase project configuration (defaults to EU).
        </li>
      </ul>
      <p>
        Each sub-processor is bound by a written agreement with data-protection terms no less
        protective than this DPA. To request the current sub-processor agreement, email{" "}
        <a href="mailto:dpa@widgetly.app">dpa@widgetly.app</a>.
      </p>

      <h2 id="security">Security</h2>
      <p>
        We implement the technical and organizational measures described in our{" "}
        <Link href="/security">Security</Link> page, including TLS 1.3 in transit, encryption at
        rest, access controls, audit logging, and incident response. We will not materially weaken
        those measures without notifying you in advance.
      </p>

      <h2 id="transfers">International Transfers</h2>
      <p>
        Primary data storage is in the European Union. If a sub-processor transfers personal data
        outside the EEA, we rely on the European Commission&apos;s Standard Contractual Clauses
        (2021/914), the EU-US Data Privacy Framework (where applicable), or equivalent legal
        transfer mechanisms. You can request a copy of the relevant safeguards by emailing{" "}
        <a href="mailto:dpa@widgetly.app">dpa@widgetly.app</a>.
      </p>

      <h2 id="sub-processing-changes">Changes to Sub-processors</h2>
      <p>
        We will notify you at least 30 days before adding or replacing a sub-processor. If you have
        a reasonable, documented objection to the change, we will work with you in good faith to
        find an acceptable solution (which may include terminating the affected service without
        penalty).
      </p>

      <h2 id="your-rights">Your Rights as Controller</h2>
      <ul>
        <li>
          <strong>Access &amp; portability</strong> — request an export of all personal data we hold
          about your end users, in a machine-readable format.
        </li>
        <li>
          <strong>Deletion</strong> — request permanent deletion of all or part of your data.
          Browser-side tool data is deleted immediately; server-side data is purged within 30 days
          unless retention is required by law.
        </li>
        <li>
          <strong>Rectification</strong> — correct inaccurate personal data via the same channels.
        </li>
        <li>
          <strong>Restriction &amp; objection</strong> — pause or stop processing for legitimate
          reasons.
        </li>
      </ul>

      <h2 id="audits">Audits</h2>
      <p>
        We will provide you, on reasonable request and not more than once per year, with a summary
        of our security controls and any relevant third-party audit reports (e.g., Cloudflare&apos;s
        SOC 2 Type II). If a regulator exercises its audit right under Article 58(1) GDPR, we will
        cooperate and grant reasonable access to our facilities and records, subject to
        confidentiality.
      </p>

      <h2 id="incidents">Incident Notification</h2>
      <p>
        If we become aware of a personal data breach affecting your data, we will notify you without
        undue delay and at most within 72 hours of confirmation. The notification will include the
        nature of the breach, the categories and approximate number of data subjects affected,
        likely consequences, and the measures taken or proposed.
      </p>

      <h2 id="termination">Termination</h2>
      <p>
        Upon termination of the Widgetly service for any reason, we will, at your choice, delete or
        return all personal data within 30 days, and delete any existing copies unless retention is
        required by applicable law.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about this DPA, requests under this DPA, or data-protection complaints:{" "}
        <a href="mailto:dpa@widgetly.app">dpa@widgetly.app</a>. EU representative available on
        request. Supervisory authority: your lead supervisory authority under GDPR, or the
        equivalent in your jurisdiction.
      </p>
    </>
  );
}
