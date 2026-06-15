/**
 * Calculator mascot — a friendly little calc with a smiley display.
 * Body is the brand gradient; the screen and buttons give it character.
 */
export function CalculatorMascot() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(56,189,248,0.25)]"
    >
      <defs>
        <linearGradient id="c-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#5B6CFF" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
        <linearGradient id="c-screen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="c-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5B6CFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="105" r="70" fill="url(#c-glow)" />
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="178"
        rx="38"
        ry="5"
        fill="rgba(17,24,39,0.18)"
      />

      {/* Calculator body */}
      <rect x="55" y="50" width="90" height="110" rx="14" fill="url(#c-body)" />
      <rect x="60" y="55" width="80" height="100" rx="10" fill="rgba(255,255,255,0.08)" />

      {/* Screen */}
      <rect x="65" y="65" width="70" height="28" rx="5" fill="url(#c-screen)" />
      <rect x="68" y="68" width="64" height="4" rx="2" fill="rgba(56,189,248,0.4)" />

      {/* Smiley on the screen */}
      <g className="mascot-eyes">
        <circle cx="86" cy="80" r="2" fill="#38BDF8" />
        <circle cx="114" cy="80" r="2" fill="#38BDF8" />
      </g>
      <path
        d="M 92 85 Q 100 89 108 85"
        stroke="#38BDF8"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />

      {/* Buttons */}
      <g fill="rgba(255,255,255,0.85)">
        <circle cx="73" cy="108" r="5" />
        <circle cx="89" cy="108" r="5" />
        <circle cx="105" cy="108" r="5" />
        <circle cx="121" cy="108" r="5" />
        <circle cx="73" cy="124" r="5" />
        <circle cx="89" cy="124" r="5" />
        <circle cx="105" cy="124" r="5" />
        <circle cx="121" cy="124" r="5" />
        <circle cx="73" cy="140" r="5" />
        <circle cx="89" cy="140" r="5" />
        <rect x="100" y="135" width="26" height="10" rx="5" fill="#F472B6" />
      </g>

      {/* Tiny floating plus/minus signs */}
      <g
        className="mascot-sparkles"
        fill="#38BDF8"
        fontFamily="monospace"
        fontSize="16"
        fontWeight="700"
        opacity="0.9"
      >
        <text className="sparkle sparkle-a" x="36" y="60" textAnchor="middle">
          +
        </text>
        <text className="sparkle sparkle-b" x="168" y="65" textAnchor="middle">
          ×
        </text>
        <text className="sparkle sparkle-c" x="160" y="135" textAnchor="middle">
          =
        </text>
      </g>
    </svg>
  );
}
