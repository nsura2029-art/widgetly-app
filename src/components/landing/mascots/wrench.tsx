/**
 * Wrench mascot — a friendly developer-tools character: a wrench with
 * a face on the head, hovering at an angle like a key being twirled.
 */
export function WrenchMascot() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(16,185,129,0.25)]"
    >
      <defs>
        <linearGradient id="w-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="w-handle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="w-glow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="105" r="70" fill="url(#w-glow)" />
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="178"
        rx="38"
        ry="5"
        fill="rgba(17,24,39,0.18)"
      />

      {/* Group rotated slightly for "twirled" feel */}
      <g
        className="mascot-mag"
        style={{ transformOrigin: "100px 110px", transform: "rotate(-22deg)" }}
      >
        {/* Handle */}
        <rect x="92" y="100" width="16" height="70" rx="6" fill="url(#w-handle)" />
        <rect x="92" y="100" width="6" height="70" rx="3" fill="rgba(255,255,255,0.18)" />

        {/* Wrench head — like an open-end */}
        <path
          d="M 70 100
             L 70 70
             A 30 30 0 0 1 130 70
             L 130 100
             L 116 100
             L 116 84
             A 12 12 0 0 0 84 84
             L 84 100 Z"
          fill="url(#w-body)"
        />
        <path d="M 84 100 L 84 84 A 12 12 0 0 1 116 84 L 116 100" fill="#0F172A" />

        {/* Highlight */}
        <ellipse cx="85" cy="78" rx="8" ry="5" fill="white" opacity="0.35" />
      </g>

      {/* Face on the wrench head */}
      <g className="mascot-eyes">
        <ellipse cx="92" cy="84" rx="2.5" ry="3.5" fill="#111827" transform="rotate(-22 92 84)" />
        <ellipse cx="108" cy="84" rx="2.5" ry="3.5" fill="#111827" transform="rotate(-22 108 84)" />
      </g>

      {/* Gear sparkles */}
      <g className="mascot-sparkles">
        <circle className="sparkle sparkle-a" cx="36" cy="65" r="3" fill="#10B981" />
        <path
          className="sparkle sparkle-b"
          d="M 168 65 L 170 70 L 175 72 L 170 74 L 168 79 L 166 74 L 161 72 L 166 70 Z"
          fill="#0EA5E9"
        />
        <path
          className="sparkle sparkle-c"
          d="M 35 130 L 37 134 L 41 136 L 37 138 L 35 142 L 33 138 L 29 136 L 33 134 Z"
          fill="#14B8A6"
        />
      </g>
    </svg>
  );
}
