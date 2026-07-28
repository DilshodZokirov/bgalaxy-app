import { Capacitor } from "@capacitor/core";

/**
 * Faqat haqiqiy Android/iOS ilovada ishlaydi (brauzerda emas).
 * Splash, status bar va orqaga tugmasi shu yerda ulanadi.
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function initNativeShell() {
  if (!isNativeApp()) return;

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
