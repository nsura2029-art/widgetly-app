import { SITE_CONFIG } from "@/lib/constants";

// Ensure this route is exported as static when using `output: export`.
export const dynamic = "force-static";

export async function GET() {
  const now = new Date().toISOString();
  const urls = [
    SITE_CONFIG.url,
    `${SITE_CONFIG.url}/#features`,
    `${SITE_CONFIG.url}/#categories`,
    `${SITE_CONFIG.url}/#waitlist`,
  ];

  const urlset = urls
    .map(
      (u) =>
        `<url><loc>${u}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq></url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
