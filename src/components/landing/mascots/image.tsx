/**
 * Image / photo-tool mascot — a friendly picture frame character with
 * a little landscape (sun + mountain) and a winking eye.
 */
export function ImageMascot() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(244,114,182,0.25)]"
    >
      <defs>
        <linearGradient id="i-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
        <linearGradient id="i-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
        <linearGradient id="i-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F472B6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="i-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FBBF24" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="105" r="70" fill="url(#i-glow)" />
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="178"
        rx="38"
        ry="5"
        fill="rgba(17,24,39,0.18)"
      />

      {/* Frame */}
      <rect x="45" y="55" width="110" height="90" rx="10" fill="url(#i-frame)" />

      {/* Inner scene */}
      <rect x="55" y="65" width="90" height="70" rx="4" fill="url(#i-sky)" />

      {/* Sun */}
      <g className="mascot-mag" style={{ transformOrigin: "135px 80px" }}>
        <circle cx="135" cy="80" r="9" fill="url(#i-sun)" />
      </g>

      {/* Mountains */}
      <path d="M 55 135 L 75 105 L 90 120 L 110 95 L 130 135 Z" fill="#7B61FF" />
      <path d="M 95 135 L 110 115 L 125 130 L 145 135 Z" fill="#5B6CFF" opacity="0.85" />

      {/* Smile at the bottom of the scene */}
      <path
        d="M 88 128 Q 100 134 112 128"
        stroke="#111827"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyes on the frame (top corners) */}
      <g className="mascot-eyes">
        <ellipse cx="78" cy="80" rx="3.5" ry="5" fill="#111827" />
        <ellipse cx="122" cy="80" rx="3.5" ry="5" fill="#111827" />
      </g>

      {/* Camera-flash sparkles */}
      <g className="mascot-sparkles">
        <path
          className="sparkle sparkle-a"
          d="M 36 50 L 38 55 L 43 57 L 38 59 L 36 64 L 34 59 L 29 57 L 34 55 Z"
          fill="#F472B6"
        />
        <path
          className="sparkle sparkle-b"
          d="M 168 110 L 170 115 L 175 117 L 170 119 L 168 124 L 166 119 L 161 117 L 166 115 Z"
          fill="#A855F7"
        />
        <circle className="sparkle sparkle-c" cx="170" cy="50" r="3" fill="#FBBF24" />
      </g>
    </svg>
  );
}
