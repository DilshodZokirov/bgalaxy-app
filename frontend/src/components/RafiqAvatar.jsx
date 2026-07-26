/** Compact Ziyo mark — SVG for tiny UI, photo for larger sizes. */
export default function RafiqAvatar({ size = 52, variant = "svg" }) {
  if (variant === "photo" || size >= 64) {
    return (
      <img
        className="ziyo-avatar-photo"
        src="/ziyo-icon.png"
        alt="Ziyo"
        width={size}
        height={size}
        draggable={false}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg
      className="ziyo-avatar-svg"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id="ziyo-glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ziyo-shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="ziyo-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      <circle cx="40" cy="40" r="34" fill="url(#ziyo-glow)" />
      <circle cx="40" cy="40" r="28" fill="url(#ziyo-shell)" />
      <circle cx="40" cy="40" r="28" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />

      {/* ear pods */}
      <circle cx="14" cy="40" r="7" fill="#1e293b" stroke="#a78bfa" strokeWidth="2.2" />
      <circle cx="66" cy="40" r="7" fill="#1e293b" stroke="#a78bfa" strokeWidth="2.2" />
      <circle cx="14" cy="40" r="2.2" fill="#c4b5fd" />
      <circle cx="66" cy="40" r="2.2" fill="#c4b5fd" />

      {/* visor */}
      <ellipse cx="40" cy="41" rx="18" ry="14" fill="url(#ziyo-visor)" />
      <path
        d="M30 40c2.2-3.2 5-4.8 10-4.8s7.8 1.6 10 4.8"
        stroke="#67e8f9"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M33 48c2 1.6 12 1.6 14 0"
        stroke="#67e8f9"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}
