import { useState } from "react";
import Sidebar from "./Sidebar";
import RafiqFloatingButton from "./RafiqFloatingButton";
import NotificationBell from "./NotificationBell";
import EmailVerifyBanner from "./EmailVerifyBanner";
import ThemeToggleButton from "./ThemeToggleButton";
import ComplaintButton from "./ComplaintButton";
import SettingsPopup from "./SettingsPopup";
import { useAuth } from "../hooks/useAuth";

export default function AppShell({ children, variant, skyMode }) {
  const { user, refreshUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const isGalaxy = variant === "galaxy";
  const shellClass = [
    "app-shell",
    isGalaxy ? "galaxy-shell" : "",
    isGalaxy && skyMode ? `galaxy-shell-${skyMode}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const mainClass = isGalaxy ? "main-content galaxy-main" : "main-content";

  return (
    <div className={shellClass}>
      <Sidebar
        onOpenSettings={() => setShowSettings(true)}
        variant={isGalaxy ? "galaxy" : "default"}
      />
      <main className={mainClass}>
        <EmailVerifyBanner />
        {children}
      </main>
      {!isGalaxy && <ThemeToggleButton />}
      {!isGalaxy && <NotificationBell />}
      {!isGalaxy && <RafiqFloatingButton />}
      <ComplaintButton />
      {showSettings && (
        <SettingsPopup user={user} onClose={() => setShowSettings(false)} onSaved={refreshUser} />
      )}
    </div>
  );
}
