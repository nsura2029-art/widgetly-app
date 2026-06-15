/**
 * PDF mascot — a friendly document character with a folded corner,
 * subtle text lines, and a smile.
 */
export function PdfMascot() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(239,68,68,0.22)]"
    >
      <defs>
        <linearGradient id="p-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="p-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FB7185" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="105" r="70" fill="url(#p-glow)" />
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="178"
        rx="38"
        ry="5"
        fill="rgba(17,24,39,0.18)"
      />

      {/* Document body (with folded corner) */}
      <path d="M 60 45 L 130 45 L 150 65 L 150 155 L 60 155 Z" fill="url(#p-body)" />
      {/* Folded corner */}
      <path d="M 130 45 L 130 65 L 150 65 Z" fill="rgba(255,255,255,0.18)" />
      <path
        d="M 130 45 L 130 65 L 150 65"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
        fill="none"
      />

      {/* PDF badge */}
      <g className="mascot-mag" style={{ transformOrigin: "105px 88px" }}>
        <rect x="80" y="72" width="50" height="28" rx="6" fill="white" />
        <text
          x="105"
          y="92"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="14"
          fontWeight="800"
          fill="#F43F5E"
          letterSpacing="0.5"
        >
          PDF
        </text>
      </g>

      {/* Text lines (animated shimmer) */}
      <g className="mascot-sparkles">
        <rect
          x="72"
          y="112"
          width="66"
          height="3"
          rx="1.5"
          fill="rgba(255,255,255,0.85)"
          className="sparkle sparkle-a"
        />
        <rect
          x="72"
          y="122"
          width="48"
          height="3"
          rx="1.5"
          fill="rgba(255,255,255,0.7)"
          className="sparkle sparkle-b"
        />
        <rect
          x="72"
          y="132"
          width="56"
          height="3"
          rx="1.5"
          fill="rgba(255,255,255,0.6)"
          className="sparkle sparkle-c"
        />
      </g>

      {/* Eyes */}
      <g className="mascot-eyes">
        <ellipse cx="88" cy="92" rx="3" ry="4" fill="#111827" />
        <ellipse cx="122" cy="92" rx="3" ry="4" fill="#111827" />
      </g>

      {/* Corner sparkles */}
      <g>
        <path
          d="M 30 60 L 32 64 L 36 66 L 32 68 L 30 72 L 28 68 L 24 66 L 28 64 Z"
          fill="#FB7185"
          className="sparkle sparkle-a"
        />
        <path
          d="M 170 130 L 172 134 L 176 136 L 172 138 L 170 142 L 168 138 L 164 136 L 168 134 Z"
          fill="#A855F7"
          className="sparkle sparkle-b"
        />
        <circle cx="35" cy="135" r="2.5" fill="#F43F5E" className="sparkle sparkle-c" />
      </g>
    </svg>
  );
}
