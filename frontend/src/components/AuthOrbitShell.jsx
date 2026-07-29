import { Link } from "react-router-dom";
import { isNativeApp } from "../native";

/**
 * Auth gate — mockupdagi markazlashgan Login/Register qobig‘i.
 * Mobil birinchi: logo, forma, pastki atmosfera.
 */
export default function AuthOrbitShell({
  title,
  subtitle,
  children,
  footer,
  art = "portal",
  kicker: _kicker,
}) {
  const brandTo = isNativeApp() ? "/login" : "/";

  return (
    <div className={`auth-gate art-${art}`}>
      <div className="auth-gate-sky" aria-hidden>
        <span className="auth-gate-nebula n1" />
        <span className="auth-gate-nebula n2" />
        <span className="auth-gate-stars" />
      </div>

      <div className="auth-gate-inner">
        <Link to={brandTo} className="auth-gate-brand">
          <span className="auth-gate-mark" aria-hidden>
            <span className="auth-gate-orbit o1" />
            <span className="auth-gate-orbit o2" />
            <span className="auth-gate-planet" />
          </span>
          <strong className="auth-gate-wordmark">BGALAXY</strong>
          <em className="auth-gate-tag">YOUR GATEWAY TO METAVERSE</em>
        </Link>

        {(title || subtitle) && (
          <header className="auth-gate-head">
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </header>
        )}

        <section className="auth-gate-card">{children}</section>

        {footer && <div className="auth-gate-footer">{footer}</div>}
      </div>

      <div className="auth-gate-horizon" aria-hidden>
        <div className={`auth-gate-art ${art}`} />
      </div>
    </div>
  );
}
