import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getUiTheme } from "../data/uiThemes";

let backgroundLayer = null;

function getLayer() {
  if (!backgroundLayer) {
    backgroundLayer = document.createElement("div");
    backgroundLayer.id = "app-background-layer";
    document.body.appendChild(backgroundLayer);
  }
  return backgroundLayer;
}

function toCssBackground(value) {
  if (!value) return "";
  const isImage = value.startsWith("data:") || value.startsWith("http") || value.startsWith("/");
  return isImage ? `url(${value})` : value;
}

export default function ThemeApplier() {
  const { user } = useAuth();
  const theme = user?.theme || "dark";
  const background = theme === "light" ? user?.light_background : user?.dark_background;
  const uiThemeId = user?.ui_theme || "default";
  const palette = getUiTheme(uiThemeId);
  const hasCustomBg = Boolean(background && String(background).trim());
  const isSystemUi = uiThemeId === "default" && !hasCustomBg;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--blue", palette.blue);
    root.setProperty("--purple", palette.purple);
    root.setProperty("--cyan", palette.cyan);
    root.setProperty("--green", palette.green);
    root.setProperty("--orange", palette.orange);
    root.setProperty("--gradient", `linear-gradient(135deg, ${palette.blue}, ${palette.purple})`);
    root.setProperty("--ui-accent", palette.cyan || palette.blue);
    document.documentElement.setAttribute("data-ui-theme", palette.id);
  }, [palette]);

  useEffect(() => {
    const layer = getLayer();
    const cssBg = toCssBackground(background);
    const root = document.documentElement;

    if (cssBg) {
      root.setAttribute("data-custom-bg", "1");
      root.style.setProperty("--custom-shell-bg", cssBg);
      layer.style.background = cssBg;
      layer.style.backgroundSize = "cover";
      layer.style.backgroundPosition = "center";
      layer.style.backgroundRepeat = "no-repeat";
    } else {
      root.removeAttribute("data-custom-bg");
      root.style.removeProperty("--custom-shell-bg");
      layer.style.background = "none";
    }

    if (isSystemUi) {
      root.setAttribute("data-system-ui", "1");
    } else {
      root.removeAttribute("data-system-ui");
    }
  }, [background, isSystemUi]);

  return null;
}
