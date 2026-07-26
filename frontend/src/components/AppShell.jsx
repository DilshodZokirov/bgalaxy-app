import { useState } from "react";
import Sidebar from "./Sidebar";
import EmailVerifyBanner from "./EmailVerifyBanner";
import ComplaintButton from "./ComplaintButton";
import SettingsPopup from "./SettingsPopup";
import GalaxySkyBackdrop from "./GalaxySkyBackdrop";
import GalaxyAppBar from "./GalaxyAppBar";
import { useAuth } from "../hooks/useAuth";

export default function AppShell({ children, topLeft = null, hideAppBar = false }) {
  const { user, refreshUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const theme = user?.theme || "dark";
  const skyMode = theme === "light" ? "day" : "night";

  const shellClass = ["app-shell", "galaxy-shell", `galaxy-shell-${skyMode}`].join(" ");

  return (
    <div className={shellClass}>
      <Sidebar onOpenSettings={() => setShowSettings(true)} variant="galaxy" />
      <main className="main-content galaxy-main">
        <div className={`galaxy-chrome sky-${skyMode}`}>
          <GalaxySkyBackdrop mode={skyMode} />
          <EmailVerifyBanner />
          {!hideAppBar && <GalaxyAppBar left={topLeft} />}
          <div className="galaxy-chrome-body">{children}</div>
        </div>
      </main>
      <ComplaintButton />
      {showSettings && (
        <SettingsPopup user={user} onClose={() => setShowSettings(false)} onSaved={refreshUser} />
      )}
    </div>
  );
}
