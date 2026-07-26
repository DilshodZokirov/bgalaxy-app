function FancyLine({ text, className = "", startDelay = 0 }) {
  const letters = text.split("");
  return (
    <span className={`galaxy-welcome-face ${className}`}>
      {letters.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="galaxy-welcome-letter"
          style={{ animationDelay: `${startDelay + i * 0.035}s` }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

export default function GalaxyWelcome({ name }) {
  const displayName = name || "foydalanuvchi";

  return (
    <div className="galaxy-welcome">
      <div className="galaxy-welcome-stage" aria-hidden>
        <span className="galaxy-welcome-orb o1" />
        <span className="galaxy-welcome-orb o2" />
        <span className="galaxy-welcome-orb o3" />
        <span className="galaxy-welcome-spark s1" />
        <span className="galaxy-welcome-spark s2" />
        <span className="galaxy-welcome-spark s3" />
        <span className="galaxy-welcome-spark s4" />
      </div>

      <h1 className="galaxy-welcome-title">
        <span className="galaxy-welcome-depth" aria-hidden>
          <span>Xush kelibsiz</span>
          <span>{displayName}!</span>
        </span>

        <span className="galaxy-welcome-lines">
          <FancyLine text="Xush kelibsiz" className="galaxy-welcome-line-top" />
          <span className="galaxy-welcome-line-name">
            <FancyLine text={`${displayName}!`} className="galaxy-welcome-name" startDelay={0.35} />
            <span className="galaxy-welcome-wave" style={{ animationDelay: "0.7s" }}>
              👋
            </span>
          </span>
        </span>
      </h1>

      <p className="galaxy-welcome-sub">
        <span>BG</span> — Sizning biznesingiz uchun yagona galaktika
      </p>
    </div>
  );
}
