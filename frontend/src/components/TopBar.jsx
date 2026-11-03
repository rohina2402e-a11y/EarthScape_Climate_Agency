import { Link } from "react-router-dom";
import NavIcon from "./NavIcon.jsx";

export default function TopBar({ title, onMenuClick, unreadNotificationCount }) {
  return (
    <header className="topbar">
      <div className="topbar-leading">
        <button
          aria-label="Open navigation menu"
          className="icon-button mobile-menu-button"
          onClick={onMenuClick}
          type="button"
        >
          <NavIcon name="menu" />
        </button>
        <div className="breadcrumb">
          <span>Workspace</span>
          <NavIcon name="chevron" size={14} />
          <strong>{title}</strong>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="topbar-date">
          <NavIcon name="calendar" size={16} />
          <span>Climate monitoring</span>
        </div>
        <Link
          aria-label={unreadNotificationCount > 0
            ? `Open notifications, ${unreadNotificationCount} unread`
            : "Open notifications"}
          className="icon-button topbar-notifications"
          to="/notifications"
        >
          <NavIcon name="bell" size={19} />
          {unreadNotificationCount > 0 && <span className="notification-indicator" />}
        </Link>
        <div className="topbar-divider" />
        <div className="topbar-user">
          <span className="topbar-avatar">EA</span>
          <span className="topbar-user-copy">
            <strong>EarthScape Analyst</strong>
            <span>Climate research</span>
          </span>
        </div>
      </div>
    </header>
  );
}
