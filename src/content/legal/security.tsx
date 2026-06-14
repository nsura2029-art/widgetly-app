import React from "react";

export const lastUpdated = "2026-06-13";

export const PLAIN_ENGLISH =
  "We run on Cloudflare's edge network with TLS everywhere. Most tools run in your browser so your files never reach our servers. We encrypt data in transit and at rest, restrict access to a small team, and have an incident-response plan. Found a bug? Tell us — we'd rather hear about it than have you tweet it.";

export default function SecurityContent() {
  return (
    <>
      <h2 id="overview">1. Security Overview</h2>
      <p>
        Widgetly is built on the assumption that any component can fail or be attacked. We design
        for that — least-privilege access, defense in depth, and small blast radius when something
        goes wrong. This page explains the specific measures we take. If you have questions or
        feedback, write to <a href="mailto:security@widgetly.app">security@widgetly.app</a>.
      </p>

      <h2 id="infrastructure">2. Infrastructure</h2>
      <p>
        The Service runs on Cloudflare&apos;s global edge network, deployed as a Cloudflare Worker
        via the OpenNext adapter. The architecture is deliberately simple: static assets served from
        Cloudflare&apos;s cache, dynamic pages rendered on demand at the edge, no long-running
        origin servers, no always-on databases exposed to the internet.
      </p>
      <p>This shape gives us a few security properties for free:</p>
      <ul>
        <li>
          <strong>No origin to attack.</strong> There&apos;s no fixed-IP origin server that an
          attacker can scan, fingerprint, or DDoS. All traffic terminates at Cloudflare&apos;s edge.
        </li>
        <li>
          <strong>Smaller surface area.</strong> The Worker runs a small, well-known set of
          handlers. There&apos;s no SSH, no admin panel, no exposed management interface.
        </li>
        <li>
          <strong>Built-in DDoS protection.</strong> Layer 3/4/7 DDoS mitigation is on by default at
          the edge.
        </li>
      </ul>

      <h2 id="encryption">3. Encryption</h2>

      <h3 id="in-transit">In transit</h3>
      <p>
        All traffic between your browser and Widgetly is encrypted with TLS 1.3. We don&apos;t serve
        anything over plain HTTP. HSTS is enabled with a long max-age so browsers refuse to
        downgrade. HTTP/3 is enabled at the edge.
      </p>

      <h3 id="at-rest">At rest</h3>
      <p>
        Persistent data (account information, form submissions, support emails) is stored in
        Cloudflare D1 and Workers KV. Both are encrypted at rest by default. Form submissions are
        encrypted with envelope encryption before they touch storage.
      </p>

      <h2 id="browser-side">4. Browser-Side Tools</h2>
      <p>
        The vast majority of Widgetly tools — PDF, image, calculator, developer utilities — run
        entirely in your browser. The file you upload or the text you paste never leaves your
        device. We can&apos;t see it, we don&apos;t store it, and there&apos;s nothing for an
        attacker to steal from our side.
      </p>
      <p>
        This is the most important security property of the Service. It means the most sensitive
        workflows have no server-side attack surface at all.
      </p>

      <h2 id="server-side">5. Server-Side Tools (AI &amp; Similar)</h2>
      <p>
        A smaller set of tools — currently our AI assistants — need server processing because the
        model isn&apos;t small enough to run in your browser. For these tools:
      </p>
      <ul>
        <li>
          Your input is encrypted in transit with TLS 1.3 and processed in isolated worker
          invocations.
        </li>
        <li>
          We do not log the prompt content. We log only the request ID, response code, and latency
          for operational monitoring.
        </li>
        <li>
          We do not train models on your inputs. The model provider&apos;s data-use terms govern
          this; we&apos;ve selected providers with explicit no-train policies.
        </li>
        <li>Outputs are returned to your browser and not stored.</li>
      </ul>

      <h2 id="access-control">6. Access Controls</h2>
      <p>
        Access to production systems is restricted to a small number of named team members with a
        legitimate need. We enforce:
      </p>
      <ul>
        <li>Multi-factor authentication on every production system.</li>
        <li>Short-lived, audited credentials — no long-lived shared secrets.</li>
        <li>
          Just-in-time access requests for sensitive operations, with peer review for destructive
          actions.
        </li>
        <li>Quarterly access reviews to revoke permissions that are no longer needed.</li>
      </ul>

      <h2 id="monitoring">7. Monitoring &amp; Detection</h2>
      <p>
        We monitor the Service for abuse, anomalous traffic patterns, and known attack signatures.
        Cloudflare&apos;s edge protections block the bulk of automated abuse before it reaches our
        code. Where something does get through, we have alerting on unusual patterns — spikes in 5xx
        responses, sudden traffic from a single source, unexpected database writes — and a
        documented on-call rotation.
      </p>
      <p>
        We keep server logs for up to 30 days for security investigations, then aggregate or delete
        them. We never sell or share log data.
      </p>

      <h2 id="incident-response">8. Incident Response</h2>
      <p>
        We maintain a written incident-response plan that covers detection, triage, containment,
        eradication, recovery, and post-incident review. For incidents that affect user data,
        we&apos;ll notify affected users as soon as we have actionable information, and we&apos;ll
        publish a summary on this page once the issue is resolved.
      </p>

      <h2 id="disclosure">9. Responsible Disclosure</h2>
      <p>
        We welcome reports from security researchers and the broader community. If you&apos;ve found
        a vulnerability in Widgetly, please:
      </p>
      <ol>
        <li>
          Email <a href="mailto:security@widgetly.app">security@widgetly.app</a> with a description
          and a proof-of-concept.
        </li>
        <li>
          Give us a reasonable amount of time (typically 90 days) to investigate and fix before
          public disclosure.
        </li>
        <li>
          Avoid privacy violations, service disruption, and destruction of data while researching.
        </li>
      </ol>
      <p>
        We&apos;ll acknowledge your report within 3 business days and keep you informed of progress.
        Valid reports are credited (with your permission) in our security acknowledgments.
      </p>

      <h2 id="compliance">10. Compliance</h2>
      <p>
        We&apos;re a small team, so our compliance program is proportional to our size and risk
        surface. Concretely:
      </p>
      <ul>
        <li>We follow GDPR principles for all users, not just EEA residents.</li>
        <li>
          We honor CCPA / CPRA rights (access, deletion, opt-out of sale) — and since we don&apos;t
          sell data, the opt-out is automatic.
        </li>
        <li>We don&apos;t hold payment card data, so PCI-DSS doesn&apos;t apply.</li>
        <li>We don&apos;t process protected health information, so HIPAA doesn&apos;t apply.</li>
      </ul>
      <p>
        If you have a specific compliance question (for example, a procurement or vendor security
        questionnaire), email <a href="mailto:security@widgetly.app">security@widgetly.app</a>.
      </p>

      <h2 id="reporting">11. Reporting Security Issues</h2>
      <p>
        Found a security problem? Please report it to{" "}
        <a href="mailto:security@widgetly.app">security@widgetly.app</a>. Use our PGP key (below)
        for sensitive reports. We&apos;d much rather hear from you directly than read about it on
        Twitter.
      </p>
      <p>
        PGP fingerprint: <code>coming soon</code> (we&apos;ll publish the key on this page before
        any account or paid features launch).
      </p>
    </>
  );
}
