export default function GalaxyWelcome({ name }) {
  const letters = `Xush kelibsiz, ${name}!`.split("");

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
          Xush kelibsiz, {name}!
        </span>
        <span className="galaxy-welcome-face">
          {letters.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="galaxy-welcome-letter"
              style={{ animationDelay: `${i * 0.035}s` }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
          <span className="galaxy-welcome-wave" style={{ animationDelay: `${letters.length * 0.035}s` }}>
            👋
          </span>
        </span>
      </h1>

      <p className="galaxy-welcome-sub">
        <span>BG</span> — Sizning biznesingiz uchun yagona galaktika
      </p>
    </div>
  );
}
