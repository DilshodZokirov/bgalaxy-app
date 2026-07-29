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

/**
 * LiveKit / WebRTC oldidan kamera+mikrofon ruxsatini so‘raydi.
 * Android: Manifest’da CAMERA/RECORD_AUDIO bo‘lishi shart.
 */
export async function ensureMeetingMediaAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Bu qurilmada kamera/mikrofon qo‘llab-quvvatlanmaydi");
  }

  async function tryGet(constraints) {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
  }

  try {
    await tryGet({ audio: true, video: true });
    return { audio: true, video: true };
  } catch {
    try {
      await tryGet({ audio: true, video: false });
      return { audio: true, video: false };
    } catch {
      throw new Error(
        "Kamera yoki mikrofonga ruxsat berilmadi. Telefon sozlamalaridan Business Galaxy uchun ruxsat bering."
      );
    }
  }
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
