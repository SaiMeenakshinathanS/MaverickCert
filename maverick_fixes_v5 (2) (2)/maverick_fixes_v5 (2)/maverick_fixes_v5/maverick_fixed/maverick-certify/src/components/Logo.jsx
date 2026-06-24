// ---------------------------------------------------------------------
// Logo — the Maverick Certify shield mark.
// A heraldic shield with a metallic silver rim, a dark inset, and a
// bold interlocking "M" / "C" monogram rendered in the brand
// violet→pink gradient with a thin outline. An optional soft glow sits
// behind the shield. Reads correctly in both light and dark mode via
// the --mc-shield-* / --mc-letter-outline CSS variables defined in
// index.css — no theme-conditional markup needed here.
// ---------------------------------------------------------------------
export function Logo({ size = 56, glow = true, className = '' }) {
  return (
    <div
      className={`mc-logo-wrap ${glow ? 'mc-logo-glow' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 116"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Maverick Certify"
      >
        <defs>
          <linearGradient id="mc-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--mc-shield-rim-1)" />
            <stop offset="50%" stopColor="var(--mc-shield-rim-2)" />
            <stop offset="100%" stopColor="var(--mc-shield-rim-1)" />
          </linearGradient>
          <radialGradient id="mc-inset" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="var(--mc-shield-inset-1)" />
            <stop offset="100%" stopColor="var(--mc-shield-inset-2)" />
          </radialGradient>
          <linearGradient id="mc-m" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-pink)" />
            <stop offset="100%" stopColor="var(--brand-violet)" />
          </linearGradient>
          <linearGradient id="mc-c" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-violet)" />
            <stop offset="100%" stopColor="var(--brand-indigo)" />
          </linearGradient>
        </defs>

        {/* Metallic shield rim */}
        <path
          d="M50 3 L93 17 V53 C93 83 74 104 50 113 C26 104 7 83 7 53 V17 Z"
          fill="url(#mc-rim)"
        />
        {/* Dark inset where the monogram sits */}
        <path
          d="M50 9 L87 21 V53 C87 79.5 71 98 50 106.5 C29 98 13 79.5 13 53 V21 Z"
          fill="url(#mc-inset)"
        />

        {/* Interlocking M / C monogram */}
        <g stroke="var(--mc-letter-outline)" strokeWidth="1.6" strokeLinejoin="round">
          <path
            fill="url(#mc-m)"
            d="M22 76 V35 L29.5 35 L40 51 L50.5 35 L58 35 V76 L50 76 V49 L40 64 L30 49 V76 Z"
          />
          <path
            fill="url(#mc-c)"
            d="M80 49 C77.5 38 68 30 57 30 C44 30 34 41 34 54.5 C34 68 44 79 57 79 C67 79 76 72 79.5 61.5 L70.5 58 C67.8 65.5 63 70 57 70 C49 70 43 63 43 54.5 C43 46 49 39 57 39 C63.5 39 68.8 43.5 71 50 Z"
          />
        </g>
      </svg>
    </div>
  );
}

export default Logo;