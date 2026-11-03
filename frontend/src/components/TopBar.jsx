import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import NavIcon from "./NavIcon.jsx";

export default function TopBar({ title, onMenuClick, unreadNotificationCount }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

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
          <span className="topbar-avatar" aria-hidden="true">
            {(user?.email?.slice(0, 2) ?? "EA").toUpperCase()}
          </span>
          <span className="topbar-user-copy">
            <strong>{user?.email ?? "EarthScape user"}</strong>
            <span>{user?.role === "admin" ? "Administrator" : "Climate analyst"}</span>
          </span>
        </div>
        <button className="topbar-signout" onClick={handleSignOut} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}
