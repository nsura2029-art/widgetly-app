/**
 * Moose mascot — the friendly face of Widgetly itself (used in the
 * homepage hero banner). A stylised moose head with broad antlers, big
 * friendly eyes, and a small smile. Same animation contract as the
 * tool mascots (idle float / tilt / jump / blink / sparkles via the
 * `.wly-mascot-*` and `.mascot-*` classes in `globals.css`).
 */
export function MooseMascot() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full drop-shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="m-head" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="55%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient id="m-snout" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="m-antler" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <radialGradient id="m-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow halo */}
      <circle cx="100" cy="108" r="78" fill="url(#m-glow)" />

      {/* Soft drop-shadow under the head */}
      <ellipse
        className="mascot-shadow"
        cx="100"
        cy="180"
        rx="40"
        ry="5"
        fill="rgba(17,24,39,0.18)"
      />

      {/* Antlers — left */}
      <g className="mascot-mag" style={{ transformOrigin: "74px 56px" }}>
        <path
          d="M 74 70
             L 70 50
             L 58 38
             M 70 50
             L 80 42
             M 70 50
             L 64 32
             M 70 50
             L 52 44"
          stroke="url(#m-antler)"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="74" cy="70" r="3.5" fill="#F59E0B" />
      </g>

      {/* Antlers — right (mirror) */}
      <g className="mascot-mag" style={{ transformOrigin: "126px 56px" }}>
        <path
          d="M 126 70
             L 130 50
             L 142 38
             M 130 50
             L 120 42
             M 130 50
             L 136 32
             M 130 50
             L 148 44"
          stroke="url(#m-antler)"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="126" cy="70" r="3.5" fill="#F59E0B" />
      </g>

      {/* Ears — left and right small triangles peeking out */}
      <ellipse cx="60" cy="92" rx="8" ry="12" fill="#5B21B6" transform="rotate(-25 60 92)" />
      <ellipse cx="140" cy="92" rx="8" ry="12" fill="#5B21B6" transform="rotate(25 140 92)" />
      <ellipse cx="62" cy="94" rx="3" ry="6" fill="#A78BFA" transform="rotate(-25 62 94)" />
      <ellipse cx="138" cy="94" rx="3" ry="6" fill="#A78BFA" transform="rotate(25 138 94)" />

      {/* Head — big rounded shape */}
      <ellipse cx="100" cy="118" rx="50" ry="46" fill="url(#m-head)" />

      {/* Snout / muzzle — lighter colour, lower centre */}
      <ellipse cx="100" cy="138" rx="26" ry="20" fill="url(#m-snout)" />

      {/* Cheek blush */}
      <ellipse cx="74" cy="128" rx="6" ry="4" fill="#F472B6" opacity="0.45" />
      <ellipse cx="126" cy="128" rx="6" ry="4" fill="#F472B6" opacity="0.45" />

      {/* Nose */}
      <ellipse cx="100" cy="128" rx="5" ry="3.5" fill="#1F1B3A" />

      {/* Smile */}
      <path
        d="M 92 142 Q 100 148 108 142"
        stroke="#1F1B3A"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyes (blink-able via CSS) */}
      <g className="mascot-eyes">
        <ellipse cx="82" cy="110" rx="4" ry="6" fill="#1F1B3A" />
        <ellipse cx="118" cy="110" rx="4" ry="6" fill="#1F1B3A" />
        {/* Eye highlights */}
        <circle cx="83.5" cy="108" r="1.4" fill="white" />
        <circle cx="119.5" cy="108" r="1.4" fill="white" />
      </g>

      {/* Sparkles around the head */}
      <g className="mascot-sparkles">
        <path
          className="sparkle sparkle-a"
          d="M 30 60 L 32 65 L 37 67 L 32 69 L 30 74 L 28 69 L 23 67 L 28 65 Z"
          fill="#FCD34D"
        />
        <path
          className="sparkle sparkle-b"
          d="M 168 90 L 170 95 L 175 97 L 170 99 L 168 104 L 166 99 L 161 97 L 166 95 Z"
          fill="#A78BFA"
        />
        <circle className="sparkle sparkle-c" cx="170" cy="40" r="3.5" fill="#F472B6" />
        <circle className="sparkle sparkle-d" cx="36" cy="130" r="2.5" fill="#34D399" />
      </g>
    </svg>
  );
}
