import { useState } from "react";
import Sidebar from "./Sidebar";
import RafiqFloatingButton from "./RafiqFloatingButton";
import NotificationBell from "./NotificationBell";
import EmailVerifyBanner from "./EmailVerifyBanner";
import ThemeToggleButton from "./ThemeToggleButton";
import ComplaintButton from "./ComplaintButton";
import SettingsPopup from "./SettingsPopup";
import { useAuth } from "../hooks/useAuth";

export default function AppShell({ children }) {
  const { user, refreshUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar onOpenSettings={() => setShowSettings(true)} />
      <main className="main-content">
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
