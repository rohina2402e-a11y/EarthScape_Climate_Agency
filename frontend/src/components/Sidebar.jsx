import { NavLink } from "react-router-dom";
import NavIcon from "./NavIcon.jsx";

const primaryNavigation = [
  { to: "/admin", label: "Admin dashboard", icon: "dashboard" },
  { to: "/analyst", label: "Analyst workspace", icon: "analyst" }
];

const dataNavigation = [
  { to: "/data", label: "Climate data", icon: "data" },
  { to: "/visualizations", label: "Visualizations", icon: "chart" },
  { to: "/predictions", label: "Predictions", icon: "prediction" },
  { to: "/notifications", label: "Notifications", icon: "bell", badge: "3" }
];

function NavigationLink({ item, onNavigate, unreadNotificationCount }) {
  return (
    <NavLink
      className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`}
      onClick={onNavigate}
      to={item.to}
    >
      <NavIcon className="sidebar-link-icon" name={item.icon} />
      <span>{item.label}</span>
      {item.badge && unreadNotificationCount > 0 && (
        <span className="sidebar-link-badge">{unreadNotificationCount}</span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose, unreadNotificationCount }) {
  return (
    <>
      <button
        aria-label="Close navigation menu"
        className={`sidebar-scrim${open ? " is-visible" : ""}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        type="button"
      />
      <aside aria-label="Main navigation" className={`sidebar${open ? " is-open" : ""}`}>
        <NavLink aria-label="EarthScape home" className="sidebar-brand" onClick={onClose} to="/">
          <span className="brand-symbol"><NavIcon name="leaf" size={23} /></span>
          <span className="brand-wordmark">earthscape<span>.</span></span>
        </NavLink>

        <div className="sidebar-workspace">
          <span className="workspace-avatar">EA</span>
          <span className="workspace-details">
            <strong>Climate Agency</strong>
            <span>Research workspace</span>
          </span>
          <NavIcon className="workspace-chevron" name="chevron" size={16} />
        </div>

        <nav className="sidebar-navigation">
          <p className="sidebar-section-label">OVERVIEW</p>
          <NavigationLink
            item={{ to: "/", label: "Home", icon: "home" }}
            onNavigate={onClose}
          />
          {primaryNavigation.map((item) => (
            <NavigationLink key={item.to} item={item} onNavigate={onClose} />
          ))}

          <p className="sidebar-section-label sidebar-section-spaced">CLIMATE INTELLIGENCE</p>
          {dataNavigation.map((item) => (
            <NavigationLink
              key={item.to}
              item={item}
              onNavigate={onClose}
              unreadNotificationCount={unreadNotificationCount}
            />
          ))}

          <p className="sidebar-section-label sidebar-section-spaced">ORGANIZATION</p>
          <NavigationLink
            item={{ to: "/support", label: "Feedback & support", icon: "support" }}
            onNavigate={onClose}
          />
          <NavigationLink
            item={{ to: "/login", label: "Login", icon: "shield" }}
            onNavigate={onClose}
          />
        </nav>

        <div className="sidebar-footer">
          <div className="online-indicator"><span /> All systems operational</div>
          <div className="sidebar-version">EARTHSCAPE <span>•</span> v1.0</div>
        </div>
      </aside>
    </>
  );
}
