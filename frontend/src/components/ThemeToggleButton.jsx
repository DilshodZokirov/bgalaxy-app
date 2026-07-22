import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";

export default function ThemeToggleButton() {
  const { user, refreshUser, lockScreen } = useAuth();
  if (!user) return null;

  const theme = user.theme || "dark";

  async function handleToggle() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      await api.updateProfile({ theme: next });
      await refreshUser();
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button className="theme-toggle-btn" onClick={handleToggle} title={theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'u rejimga o'tish"}>
        {theme === "dark" ? "🌙" : "☀️"}
      </button>
      {user.has_pin && (
        <button className="theme-toggle-btn" style={{ right: 232 }} onClick={lockScreen} title="Ekranni qulflash">
          🔒
        </button>
      )}
    </>
  );
}
