import { useState } from "react";
import Sidebar from "./Sidebar";
import RafiqFloatingButton from "./RafiqFloatingButton";
import NotificationBell from "./NotificationBell";
import EmailVerifyBanner from "./EmailVerifyBanner";
import ThemeToggleButton from "./ThemeToggleButton";
import ComplaintButton from "./ComplaintButton";
import SettingsPopup from "./SettingsPopup";
import { useAuth } from "../hooks/useAuth";

export default function AppShell({ children, variant }) {
  const { user, refreshUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const shellClass = variant === "galaxy" ? "app-shell galaxy-shell" : "app-shell";
  const mainClass = variant === "galaxy" ? "main-content galaxy-main" : "main-content";

  return (
    <div className={shellClass}>
      <Sidebar onOpenSettings={() => setShowSettings(true)} />
      <main className={mainClass}>
        <EmailVerifyBanner />
        {children}
      </main>
      <ThemeToggleButton />
      <NotificationBell />
      <RafiqFloatingButton />
      <ComplaintButton />
      {showSettings && (
        <SettingsPopup user={user} onClose={() => setShowSettings(false)} onSaved={refreshUser} />
      )}
    </div>
  );
}
