import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBootstrap } from "../hooks/useCompany";
import RafiqAvatar from "./RafiqAvatar";

/**
 * Mockupdagi mobil past menyu (web sidebar emas):
 * Bosh sahifa · Ofislar · Xabarlar · Profil
 */
export default function MobileTabBar({ onProfile }) {
  const location = useLocation();

  const tabs = [
    { key: "home", to: "/dashboard", label: "Bosh sahifa", icon: "🏠" },
    { key: "office", to: "/office", label: "Ofislar", icon: "🏙️" },
    { key: "chat", to: "/chat", label: "Xabarlar", icon: "💬" },
  ];

  function isActive(to) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  const profileActive =
    location.pathname.startsWith("/companies") ||
    location.pathname.startsWith("/tasks") ||
    location.pathname.startsWith("/meetings") ||
    location.pathname.startsWith("/warehouse") ||
    location.pathname.startsWith("/accounting") ||
    location.pathname.startsWith("/statistika") ||
    location.pathname.startsWith("/rafiq") ||
    location.pathname.startsWith("/developer");

  return (
    <nav className="mobile-tabbar" aria-label="Asosiy menyu">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to}
          className={`mobile-tab ${isActive(tab.to) ? "active" : ""}`}
        >
          <span className="mobile-tab-icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="mobile-tab-label">{tab.label}</span>
        </Link>
      ))}
      <button
        type="button"
        className={`mobile-tab ${profileActive ? "active" : ""}`}
        onClick={onProfile}
      >
        <span className="mobile-tab-icon" aria-hidden>
          👤
        </span>
        <span className="mobile-tab-label">Profil</span>
      </button>
    </nav>
  );
}

/** Profil tab — sozlamalar + qolgan bo‘limlar (Ombor, Vazifa, …) */
export function MobileProfileSheet({ open, onClose, onOpenSettings }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { companies, company, nav, switchCompany } = useBootstrap();

  if (!open) return null;

  const initials = (user?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const links = [
    { to: "/companies", label: "Korxona", icon: "🏢" },
    { to: "/meetings", label: "Uchrashuvlar", icon: "🎥" },
    { to: "/tasks", label: "Vazifalar", icon: "🗂️" },
    { to: "/rafiq", label: "AI Ziyo", icon: "ziyo" },
  ];
  if (nav?.warehouse) links.push({ to: "/warehouse", label: "Ombor", icon: "📦" });
  if (nav?.accounting) links.push({ to: "/accounting", label: "Buxgalteriya", icon: "🧾" });
  if (nav?.analytics) links.push({ to: "/statistika", label: "Analytics", icon: "📈" });
  if (user?.is_developer) links.push({ to: "/developer", label: "Developer", icon: "🛠️" });

  return (
    <div className="mobile-more" role="dialog" aria-modal="true" aria-label="Profil">
      <button type="button" className="mobile-more-backdrop" aria-label="Yopish" onClick={onClose} />
      <div className="mobile-more-sheet">
        <div className="mobile-more-handle" aria-hidden />

        <div className="mobile-profile-card">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="mobile-profile-avatar" />
          ) : (
            <div className="mobile-profile-avatar initials">{initials}</div>
          )}
          <div className="mobile-profile-copy">
            <strong>{user?.full_name || "Foydalanuvchi"}</strong>
            <span>{user?.email || ""}</span>
          </div>
        </div>

        {companies.length > 0 && (
          <select
            className="mobile-more-company"
            value={company?.id || ""}
            onChange={(e) => {
              if (e.target.value) switchCompany(e.target.value);
            }}
            aria-label="Kompaniya"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <div className="mobile-more-grid">
          {links.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mobile-more-item ${active ? "active" : ""}`}
                onClick={onClose}
              >
                <span className="mobile-more-icon" aria-hidden>
                  {item.icon === "ziyo" ? <RafiqAvatar size={22} variant="svg" /> : item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mobile-more-actions">
          <button
            type="button"
            className="mobile-more-action"
            onClick={() => {
              onClose();
              onOpenSettings?.();
            }}
          >
            ⚙️ Sozlamalar
          </button>
          <button type="button" className="mobile-more-action danger" onClick={logout}>
            Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}
