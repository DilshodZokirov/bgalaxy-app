import { useState } from "react";
import { ProfileInfoSection, PinSection, AutoLockSection, DashboardUiSection, WarehouseSection } from "./SettingsSections";

const NAV_GROUPS = [
  {
    label: "Shaxsiy profil",
    items: [
      { key: "info", icon: "✏️", label: "Ma'lumotlar tahriri" },
      { key: "pin", icon: "🔒", label: "PIN o'zgartirish" },
      { key: "lock", icon: "⏱️", label: "Avtomatik qulflash" },
    ],
  },
  {
    label: "Dashboard tahriri",
    items: [{ key: "ui", icon: "🎨", label: "UI tahriri" }],
  },
  {
    label: "Kompaniya",
    items: [{ key: "warehouse", icon: "📦", label: "Ombor" }],
  },
];

export default function SettingsPopup({ user, onClose, onSaved }) {
  const [active, setActive] = useState("info");
  const [expanded, setExpanded] = useState({ "Shaxsiy profil": true, "Dashboard tahriri": false, "Kompaniya": false });

  function toggleGroup(label) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 760, width: "100%", height: "min(600px, 85vh)", padding: 0, display: "flex", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left nav rail */}
        <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--panel-2)", padding: "18px 10px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 14px" }}>
            <strong style={{ fontSize: 15 }}>⚙️ Sozlamalar</strong>
          </div>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 8 }}>
              <div
                onClick={() => toggleGroup(group.label)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: "6px 8px",
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {group.label}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{expanded[group.label] ? "▲" : "▼"}</span>
              </div>
              {expanded[group.label] &&
                group.items.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      marginBottom: 2,
                      background: active === item.key ? "var(--panel)" : "transparent",
                      color: active === item.key ? "var(--text)" : "var(--text-dim)",
                      fontWeight: active === item.key ? 600 : 400,
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: "22px 26px", overflowY: "auto", position: "relative" }}>
          <button
            className="secondary"
            style={{ position: "absolute", top: 16, right: 16, width: "auto", padding: "5px 12px" }}
            onClick={onClose}
          >
            ✕
          </button>

          {active === "info" && (
            <>
              <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>✏️ Ma'lumotlar tahriri</h3>
              <ProfileInfoSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "pin" && (
            <>
              <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>🔒 PIN o'zgartirish</h3>
              <PinSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "lock" && (
            <>
              <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>⏱️ Avtomatik qulflash</h3>
              <AutoLockSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "ui" && (
            <>
              <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>🎨 UI tahriri</h3>
              <DashboardUiSection user={user} onSaved={onSaved} />
            </>
          )}
          {active === "warehouse" && (
            <>
              <h3 style={{ fontSize: 16, margin: "0 0 16px" }}>📦 Ombor</h3>
              <WarehouseSection />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
