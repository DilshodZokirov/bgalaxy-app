import { useMemo, useState } from "react";
import { ProfileInfoSection, PinSection, AutoLockSection, DashboardUiSection, WarehouseSection } from "./SettingsSections";
import { useIsMobileShell } from "../native";

const NAV_GROUPS = [
  {
    label: "Shaxsiy profil",
    items: [
      { key: "info", icon: "✏️", label: "Ma'lumotlar tahriri", short: "Profil" },
      { key: "pin", icon: "🔒", label: "PIN kod", short: "PIN" },
      { key: "lock", icon: "⏱️", label: "Avtomatik qulflash", short: "Qulf" },
    ],
  },
  {
    label: "Ko'rinish",
    items: [{ key: "ui", icon: "🎨", label: "UI va tema", short: "UI" }],
  },
  {
    label: "Kompaniya",
    items: [{ key: "warehouse", icon: "📦", label: "Ombor", short: "Ombor" }],
  },
];

const FLAT_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function SettingsPopup({ user, onClose, onSaved }) {
  const isMobile = useIsMobileShell();
  const [active, setActive] = useState("info");
  const [expanded, setExpanded] = useState({
    "Shaxsiy profil": true,
    "Ko'rinish": true,
    Kompaniya: false,
  });

  const activeMeta = useMemo(() => FLAT_ITEMS.find((i) => i.key === active) || FLAT_ITEMS[0], [active]);

  function toggleGroup(label) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <div className={`settings-backdrop ${isMobile ? "is-mobile-sheet" : ""}`} onClick={onClose}>
      <div className={`settings-shell card ${isMobile ? "is-mobile" : ""}`} onClick={(e) => e.stopPropagation()}>
        {!isMobile && (
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
        )}

        <section className="settings-body">
          <div className="settings-body-top">
            {isMobile ? (
              <div className="settings-mobile-head">
                <div>
                  <p className="settings-mobile-kicker">Sozlamalar</p>
                  <strong>{activeMeta.label}</strong>
                </div>
                <button type="button" className="secondary settings-close" onClick={onClose}>
                  ✕
                </button>
              </div>
            ) : (
              <button type="button" className="secondary settings-close" onClick={onClose}>
                ✕
              </button>
            )}

            {isMobile && (
              <div className="settings-mobile-chips" role="tablist" aria-label="Sozlamalar bo‘limlari">
                {FLAT_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active === item.key}
                    className={active === item.key ? "active" : ""}
                    onClick={() => setActive(item.key)}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.short}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isMobile && active === "info" && <h3>Ma'lumotlar tahriri</h3>}
          {!isMobile && active === "pin" && <h3>PIN kod</h3>}
          {!isMobile && active === "lock" && <h3>Avtomatik qulflash</h3>}
          {!isMobile && active === "ui" && <h3>UI va tema</h3>}
          {!isMobile && active === "warehouse" && <h3>Ombor</h3>}

          {active === "info" && <ProfileInfoSection user={user} onSaved={onSaved} />}
          {active === "pin" && <PinSection user={user} onSaved={onSaved} />}
          {active === "lock" && <AutoLockSection user={user} onSaved={onSaved} />}
          {active === "ui" && <DashboardUiSection user={user} onSaved={onSaved} />}
          {active === "warehouse" && <WarehouseSection />}
        </section>
      </div>
    </div>
  );
}
