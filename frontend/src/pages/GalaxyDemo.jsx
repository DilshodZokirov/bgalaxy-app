import { useState } from "react";
import { Link } from "react-router-dom";
import GalaxyHubScene, { MODULES } from "../components/GalaxyHubScene";

const ROUTE_MAP = {
  office: "/office",
  chat: "/chat",
  ziyo: "/rafiq",
  tasks: "/tasks",
  meetings: "/meetings",
  warehouse: "/warehouse",
};

export default function GalaxyDemo() {
  const [selected, setSelected] = useState(MODULES[2]);
  const [hovered, setHovered] = useState(null);
  const focus = hovered || selected;

  return (
    <div className="galaxy-demo">
      <GalaxyHubScene
        selectedId={selected?.id}
        onSelect={setSelected}
        onHover={setHovered}
      />

      <div className="galaxy-demo-overlay">
        <header className="galaxy-demo-top">
          <Link to="/" className="galaxy-demo-brand">
            <span className="galaxy-demo-mark">BG</span>
            <span className="galaxy-demo-brand-text">
              <strong>BG</strong>
              <em>3D Hub Demo</em>
            </span>
          </Link>
          <Link to="/" className="galaxy-demo-back">
            ← Ortga
          </Link>
        </header>

        <div className="galaxy-demo-hero">
          <p className="galaxy-demo-kicker">Fantaziya prototipi</p>
          <h1>Sizning biznes galaktikangiz</h1>
          <p className="galaxy-demo-lead">
            Sayyorani bosing — bo‘lim ochiladi. Sichqoncha bilan aylantiring.
          </p>
        </div>

        <aside className="galaxy-demo-panel" key={focus?.id}>
          <div
            className="galaxy-demo-swatch"
            style={{ background: focus?.color || "#60a5fa" }}
          />
          <div>
            <h2>{focus?.label || "Modul"}</h2>
            <p>{focus?.hint || "Sayyorani tanlang"}</p>
            {focus && (
              <Link to={ROUTE_MAP[focus.id] || "/"} className="galaxy-demo-cta">
                Ochish →
              </Link>
            )}
          </div>
        </aside>

        <p className="galaxy-demo-hint">
          Bu faqat demo — keyin hybrid navigatsiyaga aylantirish mumkin
        </p>
      </div>
    </div>
  );
}
