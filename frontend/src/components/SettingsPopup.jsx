import { useState } from "react";
import { ProfileInfoSection, PinSection, AutoLockSection, DashboardUiSection, WarehouseSection } from "./SettingsSections";

const NAV_GROUPS = [
  {
    label: "Shaxsiy profil",
    items: [
      { key: "info", icon: "✏️", label: "Ma'lumotlar tahriri" },
      { key: "pin", icon: "🔒", label: "PIN kod" },
      { key: "lock", icon: "⏱️", label: "Avtomatik qulflash" },
    ],
  },
  {
    label: "Ko'rinish",
    items: [{ key: "ui", icon: "🎨", label: "UI va tema" }],
  },
  {
    label: "Kompaniya",
    items: [{ key: "warehouse", icon: "📦", label: "Ombor" }],
  },
];

export default function SettingsPopup({ user, onClose, onSaved }) {
  const [active, setActive] = useState("info");
  const [expanded, setExpanded] = useState({
    "Shaxsiy profil": true,
    "Ko'rinish": true,
    Kompaniya: false,
  });

  function toggleGroup(label) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-shell card" onClick={(e) => e.stopPropagation()}>
        <aside className="settings-nav">
          <div className="settings-nav-head">
            <strong>Sozlamalar</strong>
            <span>Orbit Control</span>
          </div>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="settings-nav-group">
              <button type="button" className="settings-nav-group-btn" onClick={() => toggleGroup(group.label)}>
                <span>{group.label}</span>
                <em>{expanded[group.label] ? "▲" : "▼"}</em>
              </button>
              {expanded[group.label] &&
                group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`settings-nav-item ${active === item.key ? "active" : ""}`}
                    onClick={() => setActive(item.key)}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
            </div>
          ))}
        </aside>

        <section className="settings-body">
          <button type="button" className="secondary settings-close" onClick={onClose}>
            ✕
          </button>

          {active === "info" && (
            <>
              <h3>Ma'lumotlar tahriri</h3>
              <ProfileInfoSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "pin" && (
            <>
              <h3>PIN kod</h3>
              <PinSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "lock" && (
            <>
              <h3>Avtomatik qulflash</h3>
              <AutoLockSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "ui" && (
            <>
              <h3>UI va tema</h3>
              <DashboardUiSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "warehouse" && (
            <>
              <h3>Ombor</h3>
              <WarehouseSection />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
