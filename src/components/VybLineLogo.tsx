/**
 * VybLiNe brand components.
 * Colors derived from the official logo:
 *   Cyan #00C8E0 · Purple #5B35B5 · Magenta #E91E8C · Orange #FF7043 · Green #00C853
 */

/** Colorful V icon mark (inline SVG — no white bg issue) */
export function VybLiNeIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="vlg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#5B35B5" />
          <stop offset="30%"  stopColor="#00C8E0" />
          <stop offset="60%"  stopColor="#00C853" />
          <stop offset="80%"  stopColor="#FF7043" />
          <stop offset="100%" stopColor="#E91E8C" />
        </linearGradient>
      </defs>
      {/* V shape */}
      <path d="M2 3L20 37L38 3H29L20 22L11 3H2Z" fill="url(#vlg)" />
      {/* Sound-wave detail in the centre of the V */}
      <path
        d="M12 18 Q14 13 16 18 Q18 23 20 18 Q22 13 24 18 Q26 23 28 18"
        stroke="white"
        strokeWidth="1.3"
        fill="none"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Full inline word-mark: "Vyb" cyan + "LiNe" in theme text colour */
export function VybLiNeWordmark({
  cyanPart = '#00C8E0',
  darkPart = 'var(--color-text)',
  size = 'text-lg',
}: {
  cyanPart?: string
  darkPart?: string
  size?: string
}) {
  return (
    <span className={`sb-heading font-bold ${size}`}>
      <span style={{ color: cyanPart }}>Vyb</span>
      <span style={{ color: darkPart }}>LiNe</span>
    </span>
  )
}
