export default function Logo({ withTagline = false, compact = false, variant = "default" }) {
  if (variant === "galaxy") {
    return (
      <div className={`logo logo-galaxy ${compact ? "compact" : ""}`}>
        <span className="logo-galaxy-mark" aria-hidden>
          <span className="logo-orbit logo-orbit-a" />
          <span className="logo-orbit logo-orbit-b" />
          <span className="logo-galaxy-star" />
          <span className="logo-galaxy-text">B</span>
        </span>
        {!compact && (
          <span className="logo-galaxy-copy">
            <strong className="logo-wordmark">BG</strong>
            <em className="logo-tagline">
              <span>One Galaxy.</span> <span>Endless Business.</span>
            </em>
            {withTagline && <em className="logo-galaxy-extra">Virtual ofis · AI · Hamkorlik</em>}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="logo">
      <span className="logo-mark">B</span>
      {!compact && (
        <span>
          <span className="logo-wordmark-plain">BG</span>
          {withTagline && <span className="logo-sub">One Galaxy. Endless Business.</span>}
        </span>
      )}
    </div>
  );
}
