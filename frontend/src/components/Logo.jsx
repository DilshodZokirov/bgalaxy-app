export default function Logo({ withTagline = false, compact = false, variant = "default" }) {
  if (variant === "galaxy") {
    return (
      <div className={`logo logo-galaxy ${compact ? "compact" : ""}`}>
        <span className="logo-galaxy-mark" aria-hidden>
          <span className="logo-galaxy-orb" />
          <span className="logo-galaxy-text">BG</span>
        </span>
        {!compact && (
          <span className="logo-galaxy-copy">
            <strong>Business Galaxy</strong>
            <em>One Galaxy. Endless Business.</em>
            {withTagline && <em className="logo-galaxy-extra">Virtual ofis · AI · Hamkorlik</em>}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="logo">
      <span className="logo-mark">BG</span>
      {!compact && (
        <span>
          BG
          <span className="logo-sub">(Business Galaxy)</span>
          {withTagline && <span className="logo-sub">One Galaxy. Endless Business.</span>}
        </span>
      )}
    </div>
  );
}
