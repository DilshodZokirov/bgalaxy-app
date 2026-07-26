import { useState } from "react";
import Sidebar from "./Sidebar";
import EmailVerifyBanner from "./EmailVerifyBanner";
import ComplaintButton from "./ComplaintButton";
import SettingsPopup from "./SettingsPopup";
import GalaxySkyBackdrop from "./GalaxySkyBackdrop";
import GalaxyAppBar from "./GalaxyAppBar";
import UpcomingMeetingBanner from "./UpcomingMeetingBanner";
import { useAuth } from "../hooks/useAuth";

export default function AppShell({
  children,
  topLeft = null,
  hideAppBar = false,
  immersive = false,
}) {
  const { user, refreshUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const theme = user?.theme || "dark";
  const skyMode = theme === "light" ? "day" : "night";

  if (immersive) {
    return (
      <div className={`office-immersive-shell galaxy-shell-${skyMode}`}>
        {children}
        {showSettings && (
          <SettingsPopup user={user} onClose={() => setShowSettings(false)} onSaved={refreshUser} />
        )}
      </div>
    );
  }

  const shellClass = ["app-shell", "galaxy-shell", `galaxy-shell-${skyMode}`].join(" ");

  return (
    <div className={shellClass}>
      <Sidebar onOpenSettings={() => setShowSettings(true)} variant="galaxy" />
      <main className="main-content galaxy-main">
        <div className={`galaxy-chrome sky-${skyMode}`}>
          <GalaxySkyBackdrop mode={skyMode} />
          <EmailVerifyBanner />
          {!hideAppBar && <GalaxyAppBar left={topLeft} />}
          <UpcomingMeetingBanner />
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
