import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import {
  fetchMyCompanies,
  getActiveCompanyId,
  getCachedNavFlags,
  setActiveCompanyId,
  setCachedNavFlags,
} from "../hooks/useCompany";
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
  const cachedFlags = getCachedNavFlags();
  const [companies, setCompanies] = useState([]);
  const [activeId, setActiveIdState] = useState(getActiveCompanyId());
  const [canManageAccounting, setCanManageAccounting] = useState(!!cachedFlags?.accounting);
  const [canViewAnalytics, setCanViewAnalytics] = useState(!!cachedFlags?.analytics);
  const [hasWarehouse, setHasWarehouse] = useState(!!cachedFlags?.warehouse);
  const [canViewWarehouse, setCanViewWarehouse] = useState(!!cachedFlags?.warehouse);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("bgalaxy_sidebar_collapsed") === "1");

  // Load companies + permissions in one pass. Never clear nav flags while a
  // request is in-flight — that caused Ombor to vanish then reappear.
  useEffect(() => {
    let cancelled = false;

    async function loadNav() {
      try {
        const list = await fetchMyCompanies();
        if (cancelled) return;
        setCompanies(list);

        const id = getActiveCompanyId() || list[0]?.id;
        if (id && id !== activeId) setActiveIdState(id);
        const active = list.find((c) => c.id === id) || list[0] || null;
        const hasWh = !!active?.has_warehouse || (active?.warehouses?.length > 0);

        if (!active) {
          // Confirmed: no company — hide optional nav
          setHasWarehouse(false);
          setCanViewWarehouse(false);
          setCanManageAccounting(false);
          setCanViewAnalytics(false);
          setCachedNavFlags({ accounting: false, analytics: false, warehouse: false });
          return;
        }

        // Keep previous flags until permissions resolve (sticky).
        if (hasWh) setHasWarehouse(true);

        const info = await api.getMyPermissions(active.id);
        if (cancelled) return;

        const accounting = info.is_owner || !!info.permissions?.manage_accounting;
        const analytics = info.is_owner || !!info.permissions?.view_analytics;
        const warehouse =
          info.is_owner ||
          !!info.permissions?.manage_warehouse ||
          !!info.permissions?.ombor_ishchi ||
          !!info.permissions?.warehouse_loader ||
          !!info.permissions?.warehouse_courier;

        setCanManageAccounting(accounting);
        setCanViewAnalytics(analytics);
        setHasWarehouse(hasWh);
        setCanViewWarehouse(warehouse);
        setCachedNavFlags({
          accounting,
          analytics,
          warehouse: hasWh && warehouse,
        });
      } catch {
        // Keep sticky/cached flags on transient errors — do not blank the nav.
      }
    }

    loadNav();
    return () => {
      cancelled = true;
    };
    // Re-run only when user switches company (full reload also remounts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

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

  let finalNavItems = [...NAV_ITEMS];
  if (canManageAccounting) {
    finalNavItems = [
      ...finalNavItems.slice(0, 4),
      { icon: "🧾", label: "Buxgalteriya", hint: "Accounting", to: "/accounting" },
      ...finalNavItems.slice(4),
    ];
  }
  if (hasWarehouse && canViewWarehouse) {
    finalNavItems = [...finalNavItems, { icon: "📦", label: "Ombor", hint: "Mahsulot oqimi", to: "/warehouse" }];
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
