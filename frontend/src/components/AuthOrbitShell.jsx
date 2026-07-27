import { Link } from "react-router-dom";
import Logo from "./Logo";
import RafiqWidget from "./RafiqWidget";

/**
 * Fantastical split auth layout: brand outside the form card.
 * `visual="widget"` shows the same landing AI Ziyo chat bot.
 */
export default function AuthOrbitShell({
  kicker = "Business Galaxy",
  title,
  subtitle,
  children,
  footer,
  visual = "robot",
}) {
  return (
    <div className="auth-orbit">
      <div className="auth-orbit-sky" aria-hidden>
        <span className="auth-orbit-glow g1" />
        <span className="auth-orbit-glow g2" />
        <span className="auth-orbit-dust" />
      </div>

      <Link to="/" className="auth-orbit-brand">
        <Logo variant="galaxy" withTagline />
      </Link>

      <div className="auth-orbit-stage">
        <aside className="auth-orbit-visual">
          <p className="auth-orbit-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {visual === "widget" ? (
            <div className="auth-orbit-widget">
              <RafiqWidget />
            </div>
          ) : (
            <div className="auth-orbit-robot-wrap">
              <img src="/ziyo-standing.webp" alt="AI Ziyo" className="auth-orbit-robot" />
              <span className="auth-orbit-robot-glow" aria-hidden />
            </div>
          )}
        </aside>

        <section className="auth-orbit-panel">
          {children}
          {footer}
        </section>
      </div>
    </div>
  );
}
