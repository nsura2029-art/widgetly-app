/**
 * Search-helper mascot — a friendly round character with a magnifying glass.
 * Pure SVG body, designed to be wrapped by `<RandomMascot>` which provides
 * the motion entry + idle animations.
 */
export function SearchMascot() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(91,108,255,0.25)]"
    >
      <defs>
        <linearGradient id="m-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B6CFF" />
          <stop offset="50%" stopColor="#7B61FF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="m-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5B6CFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="m-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8FB1" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FF8FB1" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="105" r="70" fill="url(#m-glow)" />
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="178"
        rx="38"
        ry="5"
        fill="rgba(17,24,39,0.18)"
      />
      <circle cx="100" cy="100" r="52" fill="url(#m-body)" />
      <ellipse cx="80" cy="78" rx="20" ry="12" fill="white" opacity="0.35" />
      <circle cx="70" cy="115" r="9" fill="url(#m-cheek)" />
      <circle cx="130" cy="115" r="9" fill="url(#m-cheek)" />

      <g className="mascot-eyes">
        <ellipse cx="84" cy="100" rx="4.5" ry="6.5" fill="#111827" />
        <ellipse cx="116" cy="100" rx="4.5" ry="6.5" fill="#111827" />
        <circle cx="86" cy="97" r="1.6" fill="white" />
        <circle cx="118" cy="97" r="1.6" fill="white" />
      </g>

      <path
        d="M 90 118 Q 100 126 110 118"
        stroke="#111827"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g className="mascot-mag" style={{ transformOrigin: "145px 70px" }}>
        <circle
          cx="145"
          cy="70"
          r="16"
          fill="white"
          fillOpacity="0.92"
          stroke="#5B6CFF"
          strokeWidth="4"
        />
        <circle cx="140" cy="65" r="4" fill="white" opacity="0.7" />
        <line
          x1="157"
          y1="82"
          x2="170"
          y2="95"
          stroke="#5B6CFF"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>

      <g className="mascot-sparkles">
        <path
          className="sparkle sparkle-a"
          d="M 40 55 L 42 60 L 47 62 L 42 64 L 40 69 L 38 64 L 33 62 L 38 60 Z"
          fill="#A855F7"
        />
        <path
          className="sparkle sparkle-b"
          d="M 170 125 L 172 130 L 177 132 L 172 134 L 170 139 L 168 134 L 163 132 L 168 130 Z"
          fill="#5B6CFF"
        />
        <circle className="sparkle sparkle-c" cx="165" cy="40" r="3" fill="#7B61FF" />
      </g>
    </svg>
  );
}
