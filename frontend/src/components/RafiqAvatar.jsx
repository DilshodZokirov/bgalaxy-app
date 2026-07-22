export default function RafiqAvatar({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rafiq-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rafiq-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="rafiq-body-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f7fff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="rafiq-eye" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#bfeaff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </radialGradient>
      </defs>

      {/* ambient glow */}
      <circle cx="40" cy="38" r="34" fill="url(#rafiq-glow)" />

      {/* shoulders / torso hint */}
      <path d="M18 68 C18 54 27 48 40 48 C53 48 62 54 62 68 Z" fill="url(#rafiq-body-light)" opacity="0.9" />

      {/* antenna, peeking above the doppi */}
      <line x1="40" y1="13" x2="40" y2="7" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="40" cy="5.5" r="2.4" fill="#22d3ee" />

      {/* robot head — rounded square, soft gradient */}
      <rect x="16" y="17" width="48" height="44" rx="17" fill="url(#rafiq-body)" />
      <rect x="16" y="17" width="48" height="22" rx="17" fill="#ffffff" opacity="0.08" />

      {/* do'ppi (traditional Uzbek Chust cap) sitting on top of the head */}
      <path d="M14 25 A26 14.5 0 0 1 66 25 L62.5 28 A22 12 0 0 0 17.5 28 Z" fill="#111827" />
      <rect x="13.5" y="23" width="53" height="6" rx="3" fill="#111827" />
      <g fill="#f1f5f9">
        <path d="M23.5 25.6c0-1.2.9-2.1 2.1-2.1s2.1.9 2.1 2.1-2.1 3-2.1 3-2.1-1.8-2.1-3z" />
        <path d="M33.6 24.8c0-1.2.9-2.1 2.1-2.1s2.1.9 2.1 2.1-2.1 3-2.1 3-2.1-1.8-2.1-3z" />
        <path d="M44.2 24.8c0-1.2.9-2.1 2.1-2.1s2.1.9 2.1 2.1-2.1 3-2.1 3-2.1-1.8-2.1-3z" />
        <path d="M54.3 25.6c0-1.2.9-2.1 2.1-2.1s2.1.9 2.1 2.1-2.1 3-2.1 3-2.1-1.8-2.1-3z" />
      </g>

      {/* glowing eyes */}
      <ellipse cx="29.5" cy="41" rx="6.2" ry="8" fill="url(#rafiq-eye)" />
      <ellipse cx="50.5" cy="41" rx="6.2" ry="8" fill="url(#rafiq-eye)" />
      <ellipse cx="29.5" cy="41" rx="6.2" ry="8" fill="none" stroke="#0a0e17" strokeWidth="1" opacity="0.15" />
      <ellipse cx="50.5" cy="41" rx="6.2" ry="8" fill="none" stroke="#0a0e17" strokeWidth="1" opacity="0.15" />

      {/* soft smile */}
      <path d="M31 52c3 2.5 15 2.5 18 0" stroke="#0a0e17" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />

      {/* cheek glow accents */}
      <circle cx="21" cy="46" r="2.4" fill="#22d3ee" opacity="0.5" />
      <circle cx="59" cy="46" r="2.4" fill="#22d3ee" opacity="0.5" />
    </svg>
  );
}
