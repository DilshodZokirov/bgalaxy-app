import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import NotificationBell from "./NotificationBell";
import RafiqFloatingButton from "./RafiqFloatingButton";

export default function GalaxyAppBar({ left = null }) {
  const { user, refreshUser, lockScreen } = useAuth();
  const theme = user?.theme || "dark";
  const skyMode = theme === "light" ? "day" : "night";

  async function toggleSky() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      await api.updateProfile({ theme: next });
      await refreshUser();
    } catch {
      // ignore
    }
  }

  return (
    <header className="galaxy-top galaxy-app-bar">
      <div className="galaxy-top-left">
        {left || (
          <div className="galaxy-app-bar-fallback">
            <strong>Business Galaxy</strong>
            <span>Bitta galaktika. Cheksiz biznes.</span>
          </div>
        )}
      </div>

      <label className="galaxy-search">
        <span className="galaxy-search-icon">⌕</span>
        <input type="search" placeholder="Qidiruv..." disabled />
        <kbd>⌘K</kbd>
      </label>

      <div className="galaxy-top-right">
        {user?.has_pin && (
          <button type="button" className="galaxy-icon-btn" title="Ekranni qulflash" onClick={lockScreen}>
            🔒
          </button>
        )}
        <button
          type="button"
          className="galaxy-icon-btn galaxy-sky-toggle"
          title={skyMode === "night" ? "Quyoshli fonga o'tish" : "Oylik fonga o'tish"}
          onClick={toggleSky}
        >
          {skyMode === "night" ? "🌙" : "☀️"}
        </button>
        <NotificationBell variant="inline" />
        <RafiqFloatingButton variant="header" />
      </div>
    </header>
  );
}
