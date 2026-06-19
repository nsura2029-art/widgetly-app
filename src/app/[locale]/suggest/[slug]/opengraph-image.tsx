import { ImageResponse } from "next/og";
import { getSuggestion, statusLabel } from "@/lib/suggestions-seed";

/**
 * Open Graph image for `/suggest/[slug]`.
 *
 * Next.js's `opengraph-image.tsx` convention: any route can
 * co-locate an `opengraph-image.{tsx,jpg,png}` and Next.js will
 * serve the generated image at `/<route>/opengraph-image` and
 * automatically wire it into the page's OG metadata. We use the
 * TSX variant because every page needs a unique image (the
 * tool name and vote count are different per slug) and we
 * already have the data layer.
 *
 * Renders at 1200×630 (the standard OG size). Uses the brand
 * gradient, the same Inter font as the rest of the site, and
 * the live `voteCount` from the seed data.
 *
 * Note on the `runtime`: OG image generation runs in the Node
 * runtime (not edge) because the `ImageResponse` helper uses
 * Satori under the hood, which depends on Node-style modules.
 * Next.js handles this transparently.
 */
export const alt = "Widgetly tool suggestion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getSuggestion(slug);
  // Fallback for unknown slugs (e.g. during a deploy race). The
  // page itself 404s in this case but the OG endpoint shouldn't.
  const name = s?.name ?? slug;
  const tagline = s?.ogTagline ?? s?.pitch ?? "Community-suggested Widgetly tool.";
  const votes = s?.voteCount ?? 0;
  const status = s ? statusLabel(s.status) : "Pending review";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #5b6cff 0%, #7b61ff 50%, #a855f7 100%)",
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 64,
        position: "relative",
      }}
    >
      {/* Background ornaments — soft glowing orbs */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.12)",
          filter: "blur(60px)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: -80,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.10)",
          filter: "blur(70px)",
          display: "flex",
        }}
      />

      {/* Top row — Widgetly mark + status pill */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.20)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            W
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>Widgetly</div>
            <div style={{ fontSize: 15, opacity: 0.8 }}>Community-suggested tool</div>
          </div>
        </div>
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "rgba(255, 255, 255, 0.18)",
            backdropFilter: "blur(8px)",
            fontSize: 15,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            letterSpacing: 0.5,
          }}
        >
          {status}
        </div>
      </div>

      {/* Middle — tool name + tagline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 48,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            maxWidth: 1020,
            display: "flex",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            marginTop: 24,
            opacity: 0.92,
            maxWidth: 1020,
            lineHeight: 1.3,
            display: "flex",
          }}
        >
          {tagline}
        </div>
      </div>

      {/* Bottom row — vote count + url */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              background: "#22c55e",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 22, fontWeight: 600, display: "flex" }}>
            {votes.toLocaleString()} {votes === 1 ? "vote" : "votes"}
          </div>
        </div>
        <div style={{ fontSize: 18, opacity: 0.8, display: "flex" }}>
          widgetly.tech/suggest/{slug}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
