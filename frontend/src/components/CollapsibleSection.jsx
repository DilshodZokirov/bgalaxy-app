import { useState } from "react";

export default function CollapsibleSection({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <h3 style={{ fontSize: 15, margin: 0 }}>{icon} {title}</h3>
        <span style={{ color: "var(--text-dim)", fontSize: 13 }}>{open ? "▲ Yopish" : "▼ Ko'rish"}</span>
      </div>
      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}
