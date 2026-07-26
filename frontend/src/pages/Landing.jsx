import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/Logo";
import RafiqWidget from "../components/RafiqWidget";

const FEATURES = [
  {
    icon: "🏢",
    color: "blue",
    title: "Virtual ofislar",
    desc: "3D muhitda o'z korxonangizni oching — jamoangiz bilan real vaqtli uchrashing va muloqot qiling.",
  },
  {
    icon: "🤝",
    color: "purple",
    title: "Smart hamkorlik",
    desc: "Chat, vazifalar va hujjatlar — barchasi bitta joyda, dasturlar orasida yugurishga hojat yo'q.",
  },
  {
    icon: "🤖",
    color: "cyan",
    title: "AI Ziyo",
    desc: "Uchrashuv rejalashtirish, hujjat tahlili, tarjima — yordamchingiz doim yoningizda.",
  },
  {
    icon: "🌍",
    color: "orange",
    title: "Global aloqalar",
    desc: "Qayerda bo'lmang, jamoangiz va mijozlaringiz bilan bir galaktikada bo'ling.",
  },
];

const FEATURE_BG = {
  blue: "rgba(37,99,235,0.15)",
  purple: "rgba(124,58,237,0.15)",
  cyan: "rgba(34,211,238,0.15)",
  orange: "rgba(245,158,11,0.15)",
};

const FEATURE_FG = {
  blue: "var(--blue)",
  purple: "var(--purple)",
  cyan: "var(--cyan)",
  orange: "var(--orange)",
};

export default function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo />
        <div className="nav-actions">
          <Link to="/galaxy-demo">
            <button className="secondary">3D Galaxy Demo</button>
          </Link>
          {!loading && user ? (
            <Link to="/dashboard">
              <button>Boshqaruv paneli →</button>
            </Link>
          ) : (
            !loading && (
              <>
                <Link to="/login">
                  <button className="secondary">Kirish</button>
                </Link>
                <Link to="/register">
                  <button>Bepul boshlash</button>
                </Link>
              </>
            )
          )}
        </div>
      </nav>

      <section className="hero">
        <div>
          <div className="hero-eyebrow">
            <span className="dot" />
            AI Ziyo har doim onlayn
          </div>
          <h1>
            Kelajakdagi ish muhitini <span className="accent">bitta galaktikada</span> quring
          </h1>
          <p className="lead">
            BG (Business Galaxy) — AI va 3D virtual muhitni birlashtiruvchi biznes platformasi.
            Jamoangiz, uchrashuvlaringiz va sun'iy intellekt yordamchingiz — barchasi
            bitta joyda.
          </p>
          <div className="hero-ctas">
            {!loading && user ? (
              <Link to="/dashboard">
                <button>Boshqaruv paneliga o'tish →</button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <button>Bepul ro'yxatdan o'tish →</button>
                </Link>
                <Link to="/login">
                  <button className="secondary">Kirish</button>
                </Link>
              </>
            )}
          </div>
          <div className="hero-badges">
            <span className="hero-badge">
              <span className="swatch" style={{ background: "var(--blue)" }} />
              Virtual ofislar
            </span>
            <span className="hero-badge">
              <span className="swatch" style={{ background: "var(--purple)" }} />
              Smart hamkorlik
            </span>
            <span className="hero-badge">
              <span className="swatch" style={{ background: "var(--cyan)" }} />
              AI Ziyo
            </span>
          </div>
        </div>

        <RafiqWidget />
      </section>

      <div className="badge-strip">
        <div className="badge-strip-item blue">VIRTUAL OFFICES</div>
        <div className="badge-strip-item purple">SMART COLLABORATION</div>
        <div className="badge-strip-item blue">AI ASSISTANT RAFIQ</div>
        <div className="badge-strip-item purple">GLOBAL CONNECTIONS</div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Bir platformada hammasi</h2>
          <p>Zoom, Slack, Trello o'rtasida yugurish shart emas — BG (Business Galaxy) hammasini birlashtiradi.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div
                className="feature-icon"
                style={{ background: FEATURE_BG[f.color], color: FEATURE_FG[f.color] }}
              >
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="quote-section">
        <blockquote>
          "Biz shunchaki dastur yaratmayapmiz. Biz kelajakdagi ish muhitini quryapmiz."
        </blockquote>
      </section>

      <footer className="landing-footer">BG (Business Galaxy) — One Galaxy. Endless Business.</footer>
    </div>
  );
}
