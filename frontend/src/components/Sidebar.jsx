import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { getActiveCompanyId, setActiveCompanyId } from "../hooks/useCompany";
import Logo from "./Logo";

const NAV_ITEMS = [
  { icon: "🏠", label: "Bosh sahifa", to: "/dashboard" },
  { icon: "🏢", label: "Kompaniyalar", to: "/companies" },
  { icon: "🏙️", label: "Virtual Ofis", to: "/office" },
  { icon: "💬", label: "Chat", to: "/chat" },
  { icon: "🎥", label: "Uchrashuvlar", to: "/meetings" },
  { icon: "🗂️", label: "Vazifalar", to: "/tasks" },
  { icon: "🤖", label: "AI Ziyo", to: "/rafiq" },
];

export default function Sidebar({ onOpenSettings }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [companies, setCompanies] = useState([]);
  const [activeId, setActiveIdState] = useState(getActiveCompanyId());
  const [canManageAccounting, setCanManageAccounting] = useState(false);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);
  const [hasWarehouse, setHasWarehouse] = useState(false);
  const [canViewWarehouse, setCanViewWarehouse] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("bgalaxy_sidebar_collapsed") === "1");

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => {
        setCompanies(list);
        const id = getActiveCompanyId() || list[0]?.id;
        const active = list.find((c) => c.id === id) || list[0];
        setHasWarehouse(!!active?.has_warehouse);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = activeId || companies[0]?.id;
    if (!id) return;
    api
      .getMyPermissions(id)
      .then((info) => {
        setCanManageAccounting(info.is_owner || !!info.permissions?.manage_accounting);
        setCanViewAnalytics(info.is_owner || !!info.permissions?.view_analytics);
        setCanViewWarehouse(info.is_owner || !!info.permissions?.manage_warehouse || !!info.permissions?.ombor_ishchi);
      })
      .catch(() => {
        setCanManageAccounting(false);
        setCanViewAnalytics(false);
        setCanViewWarehouse(false);
      });
  }, [activeId, companies]);

  function handleSwitch(e) {
    const id = e.target.value;
    setActiveCompanyId(id);
    setActiveIdState(id);
    window.location.reload();
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bgalaxy_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  const initials = (user?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems = canManageAccounting
    ? [...NAV_ITEMS, { icon: "🧾", label: "Buxgalteriya", to: "/accounting" }]
    : NAV_ITEMS;
  const withWarehouse = hasWarehouse && canViewWarehouse
    ? [...navItems, { icon: "📦", label: "Ombor", to: "/warehouse" }]
    : navItems;
  const withAnalytics = canViewAnalytics
    ? [...withWarehouse, { icon: "📈", label: "Analitika", to: "/analytics" }]
    : withWarehouse;
  const finalNavItems = user?.is_developer
    ? [...withAnalytics, { icon: "🛠️", label: "Developer paneli", to: "/developer" }]
    : withAnalytics;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo compact={collapsed} />
        <button className="sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? "Kengaytirish" : "Siqish"}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && companies.length > 0 && (
        <select
          value={activeId || ""}
          onChange={handleSwitch}
          style={{
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 10px",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <nav className="sidebar-nav">
        {finalNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar-link ${location.pathname.startsWith(item.to) ? "active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span>{item.icon}</span>
            {!collapsed && item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
          onClick={() => onOpenSettings?.()}
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt="Avatar"
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div className="avatar-circle">{initials}</div>
          )}
          {!collapsed && (
            <div>
              <div className="name">{user?.full_name || "Foydalanuvchi"}</div>
              <div className="role">A'zo</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="secondary" onClick={logout}>
            Chiqish
          </button>
        )}
      </div>
    </aside>
  );
}
