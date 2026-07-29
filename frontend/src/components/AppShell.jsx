import { useEffect, useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const theme = user?.theme || "dark";
  const skyMode = theme === "light" ? "day" : "night";
  const activeBg = theme === "light" ? user?.light_background : user?.dark_background;
  const hasCustomBg = Boolean(activeBg && String(activeBg).trim());
  const uiThemeId = user?.ui_theme || "default";
  const useSystemSky = uiThemeId === "default" && !hasCustomBg;

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

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
    `galaxy-shell-${skyMode}`,
    hasCustomBg || uiThemeId !== "default" ? "has-custom-ui" : "",
    mobileNavOpen ? "nav-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <button
        type="button"
        className="mobile-nav-backdrop"
        aria-label="Menyuni yopish"
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={() => setMobileNavOpen(false)}
      />
      <Sidebar
        onOpenSettings={() => {
          setMobileNavOpen(false);
          setShowSettings(true);
        }}
        variant="galaxy"
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <main className="main-content galaxy-main">
        <div className={`galaxy-chrome sky-${skyMode}`}>
          {useSystemSky && <GalaxySkyBackdrop mode={skyMode} />}
          <EmailVerifyBanner />
          {!hideAppBar && (
            <GalaxyAppBar left={topLeft} onMenuClick={() => setMobileNavOpen(true)} />
          )}
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
