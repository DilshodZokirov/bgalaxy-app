import { Link } from "react-router-dom";
import Logo from "./Logo";

/**
 * Fantastical split auth layout: brand + full-body Ziyo outside the form card.
 */
export default function AuthOrbitShell({
  kicker = "Business Galaxy",
  title,
  subtitle,
  children,
  footer,
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
          <div className="auth-orbit-robot-wrap">
            <img src="/ziyo-standing.webp" alt="AI Ziyo" className="auth-orbit-robot" />
            <span className="auth-orbit-robot-glow" aria-hidden />
          </div>
        </aside>

        <section className="auth-orbit-panel">
          {children}
          {footer}
        </section>
      </div>
    </div>
  );
}
