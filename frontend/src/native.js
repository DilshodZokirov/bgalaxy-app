import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Faqat haqiqiy Android/iOS ilovada ishlaydi (brauzerda emas).
 * Splash, status bar va orqaga tugmasi shu yerda ulanadi.
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

/** Telefon / Capacitor — pastki tablar va master–detail UI uchun */
export function useIsMobileShell(maxWidth = 900) {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return isNativeApp() || window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const sync = () => setMobile(isNativeApp() || mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [maxWidth]);

  return mobile;
}

export async function initNativeShell() {
  if (!isNativeApp()) return;

  document.documentElement.classList.add("is-native-app");
  document.body.classList.add("is-native-app");

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0B1220" });
  } catch {
    // plugin yo‘q yoki web — e’tiborsiz
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // ignore
  }

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    // ignore
  }
}
