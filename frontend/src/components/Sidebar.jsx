import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBootstrap } from "../hooks/useCompany";
import Logo from "./Logo";
import RafiqAvatar from "./RafiqAvatar";

const NAV_ITEMS = [
  { icon: "🌌", label: "Galaxy Home", hint: "Bosh sahifa", to: "/dashboard" },
  { icon: "🏢", label: "Korxona", hint: "Kompaniyalar", to: "/companies" },
  { icon: "🏙️", label: "Virtual Office", hint: "3D Metaverse", to: "/office" },
  { icon: "🎥", label: "Online Meeting", hint: "Meet & Connect", to: "/meetings" },
  { icon: "💬", label: "Chat", hint: "Messages", to: "/chat" },
  { icon: "🗂️", label: "Vazifalar", hint: "Jira-style board", to: "/tasks" },
  { icon: "ziyo", label: "AI Ziyo", hint: "Yordamchi", to: "/rafiq" },
];

export default function Sidebar({ onOpenSettings, variant = "default" }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isGalaxy = variant === "galaxy";
  const { companies, company, nav, switchCompany } = useBootstrap();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("bgalaxy_sidebar_collapsed") === "1");

  const canManageAccounting = !!nav?.accounting;
  const canViewAnalytics = !!nav?.analytics;
  const showWarehouse = !!nav?.warehouse;
  const showMarketplace =
    showWarehouse &&
    (company?.company_type === "distributor" || company?.company_type === "market");
  const activeId = company?.id || "";

  function handleSwitch(e) {
    const id = e.target.value;
    if (id) switchCompany(id);
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

  let finalNavItems = [...NAV_ITEMS];
  if (canManageAccounting) {
    finalNavItems = [
      ...finalNavItems.slice(0, 4),
      { icon: "🧾", label: "Buxgalteriya", hint: "Accounting", to: "/accounting" },
      ...finalNavItems.slice(4),
    ];
  }
  if (showWarehouse) {
    finalNavItems = [...finalNavItems, { icon: "📦", label: "Ombor", hint: "Mahsulot oqimi", to: "/warehouse" }];
  }
  if (showMarketplace) {
    finalNavItems = [
      ...finalNavItems,
      { icon: "🛒", label: "Marketplace", hint: "Xarid bozori", to: "/marketplace" },
    ];
  }
  if (canViewAnalytics) {
    finalNavItems = [...finalNavItems, { icon: "📈", label: "Statistika", hint: "Statistics", to: "/statistika" }];
  }
  if (user?.is_developer) {
    finalNavItems = [...finalNavItems, { icon: "🛠️", label: "Developer", hint: "Panel", to: "/developer" }];
  }

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${isGalaxy ? "sidebar-galaxy" : ""}`}>
      <div className="sidebar-brand-row">
        <Logo compact={collapsed} variant={isGalaxy ? "galaxy" : "default"} />
        <button className="sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? "Kengaytirish" : "Siqish"}>
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && companies.length > 0 && (
        <select
          className="sidebar-company-select"
          value={activeId || ""}
          onChange={handleSwitch}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <nav className="sidebar-nav">
        {finalNavItems.map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${active ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-link-icon">
                {item.icon === "ziyo" ? (
                  <RafiqAvatar size={16} variant="svg" />
                ) : (
                  item.icon
                )}
              </span>
              {!collapsed && (
                <span className="sidebar-link-copy">
                  <span className="sidebar-link-label">{item.label}</span>
                  {isGalaxy && item.hint && <span className="sidebar-link-hint">{item.hint}</span>}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => onOpenSettings?.()}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="sidebar-avatar-img" />
          ) : (
            <div className="avatar-circle">{initials}</div>
          )}
          {!collapsed && (
            <div>
              <div className="name">{user?.full_name || "Foydalanuvchi"}</div>
              <div className="role">{user?.is_developer ? "Admin" : "A'zo"} · Sozlamalar</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="secondary sidebar-logout" onClick={logout}>
            Chiqish
          </button>
        )}
      </div>
    </aside>
  );
}
