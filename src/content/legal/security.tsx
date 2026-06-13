import React from "react";

export const lastUpdated = "2026-06-12";

export default function SecurityContent() {
  return (
    <>
      <h2 id="overview">Security Overview</h2>
      <p>Widgetly takes security seriously.</p>

      <h2 id="infrastructure">Infrastructure</h2>
      <p>Hosted on secure cloud infrastructure (Cloudflare, HTTPS, secure networking).</p>

      <h2 id="data-protection">Data Protection</h2>
      <ul>
        <li>Encryption in transit</li>
        <li>Encryption at rest</li>
        <li>Access controls</li>
      </ul>

      <h2 id="monitoring">Monitoring</h2>
      <p>Security monitoring, threat detection, and logging.</p>

      <h2 id="disclosure">Responsible Disclosure</h2>
      <p>Placeholder vulnerability reporting process.</p>

      <h2 id="reporting">Reporting Security Issues</h2>
      <p>Contact <a href="mailto:security@widgetly.app">security@widgetly.app</a></p>
    </>
  );
}
