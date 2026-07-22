import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { UI_THEMES } from "../data/uiThemes";

let backgroundLayer = null;

function getLayer() {
  if (!backgroundLayer) {
    backgroundLayer = document.createElement("div");
    backgroundLayer.id = "app-background-layer";
    document.body.appendChild(backgroundLayer);
  }
  return backgroundLayer;
}

export default function ThemeApplier() {
  const { user } = useAuth();
  const theme = user?.theme || "dark";
  const background = theme === "light" ? user?.light_background : user?.dark_background;
  const uiTheme = user?.ui_theme || "default";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const palette = UI_THEMES.find((t) => t.id === uiTheme) || UI_THEMES[0];
    const root = document.documentElement.style;
    root.setProperty("--blue", palette.blue);
    root.setProperty("--purple", palette.purple);
    root.setProperty("--cyan", palette.cyan);
    root.setProperty("--green", palette.green);
    root.setProperty("--orange", palette.orange);
    root.setProperty("--gradient", `linear-gradient(135deg, ${palette.blue}, ${palette.purple})`);
  }, [uiTheme]);

  useEffect(() => {
    const layer = getLayer();
    if (background) {
      const isImage = background.startsWith("data:") || background.startsWith("http") || background.startsWith("/");
      layer.style.background = isImage ? `url(${background})` : background;
      layer.style.backgroundSize = "cover";
      layer.style.backgroundPosition = "center";
    } else {
      layer.style.background = "none";
    }
  }, [background]);

  return null;
}
