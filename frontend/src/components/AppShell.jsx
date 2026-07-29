import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import EmailVerifyBanner from "./EmailVerifyBanner";
import ComplaintButton from "./ComplaintButton";
import SettingsPopup from "./SettingsPopup";
import GalaxySkyBackdrop from "./GalaxySkyBackdrop";
import GalaxyAppBar from "./GalaxyAppBar";
import UpcomingMeetingBanner from "./UpcomingMeetingBanner";
import MobileTabBar, { MobileProfileSheet } from "./MobileTabBar";
import { useAuth } from "../hooks/useAuth";

export default function AppShell({
  children,
  topLeft = null,
  hideAppBar = false,
  immersive = false,
}) {
  const { user, refreshUser } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const theme = user?.theme || "dark";
  const skyMode = theme === "light" ? "day" : "night";
  const activeBg = theme === "light" ? user?.light_background : user?.dark_background;
  const hasCustomBg = Boolean(activeBg && String(activeBg).trim());
  const uiThemeId = user?.ui_theme || "default";
  const useSystemSky = uiThemeId === "default" && !hasCustomBg;

  useEffect(() => {
    if (!profileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [profileOpen]);

  if (immersive) {
    return (
      <div
        className={[
          "office-immersive-shell",
          `galaxy-shell-${skyMode}`,
          hasCustomBg ? "has-custom-ui" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
        {showSettings && (
          <SettingsPopup user={user} onClose={() => setShowSettings(false)} onSaved={refreshUser} />
        )}
      </div>
    );
  }

  const shellClass = [
    "app-shell",
    "galaxy-shell",
    "has-mobile-tabs",
    `galaxy-shell-${skyMode}`,
    hasCustomBg || uiThemeId !== "default" ? "has-custom-ui" : "",
    profileOpen ? "profile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      {/* Desktop: yon sidebar. Mobil: yashiriladi — past tablar */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} variant="galaxy" />
      <main className="main-content galaxy-main">
        <div className={`galaxy-chrome sky-${skyMode}`}>
          {useSystemSky && <GalaxySkyBackdrop mode={skyMode} />}
          <EmailVerifyBanner />
          {!hideAppBar && <GalaxyAppBar left={topLeft} />}
          <UpcomingMeetingBanner />
          <div className="galaxy-chrome-body">{children}</div>
        </div>
      </main>

      <MobileTabBar onProfile={() => setProfileOpen(true)} />
      <MobileProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ComplaintButton />
      {showSettings && (
        <SettingsPopup user={user} onClose={() => setShowSettings(false)} onSaved={refreshUser} />
      )}
    </div>
  );
}
