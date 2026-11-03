import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import NavIcon from "../components/NavIcon.jsx";

function NotificationCard({ notification, onMarkRead }) {
  const severityClass = notification.severity.toLowerCase();
  return (
    <article className={`notification-card${notification.read ? " is-read" : " is-unread"}`}>
      <span className={`notification-card-severity severity-dot-${severityClass}`} />
      <div className="notification-card-icon" aria-hidden="true">
        <NavIcon name={notification.category === "Rainfall" ? "globe" : notification.category === "Data quality" ? "data" : "prediction"} size={18} />
      </div>
      <div className="notification-card-copy">
        <div className="notification-card-title-row">
          <h2>{notification.title}</h2>
          {!notification.read && <span className="notification-unread-label">New</span>}
        </div>
        <p>{notification.location}</p>
        <div className="notification-card-meta">
          <time>{notification.date}</time>
          <span className="notification-meta-divider">·</span>
          <span>{notification.category}</span>
        </div>
      </div>
      <span className={`severity-label severity-${severityClass}`}>{notification.severity}</span>
      {!notification.read && (
        <button
          aria-label={`Mark ${notification.title} as read`}
          className="notification-mark-read"
          onClick={() => onMarkRead(notification.id)}
          type="button"
        >
          Mark read
        </button>
      )}
      {notification.read && <span className="notification-read-status">Read</span>}
    </article>
  );
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useOutletContext();
  const [filter, setFilter] = useState("all");
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => filter === "all" || !notification.read),
    [filter, notifications]
  );

  return (
    <div className="admin-dashboard notifications-page">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">CLIMATE INTELLIGENCE <span>·</span> ALERT CENTER</p>
          <h1>Notifications</h1>
          <p>Review climate alerts, station updates, and data-quality notices.</p>
        </div>
        {unreadCount > 0 && (
          <button className="notifications-mark-all" onClick={markAllNotificationsRead} type="button">
            <NavIcon name="check" size={16} />
            Mark all as read
          </button>
        )}
      </header>

      <div className="sample-data-banner">
        <span className="sample-data-indicator" />
        These alerts are illustrative sample notifications. Read status is only kept while this page is open.
      </div>

      <section aria-label="Notification summary" className="notification-summary">
        <div className="notification-summary-icon"><NavIcon name="bell" size={19} /></div>
        <div>
          <strong>{unreadCount} unread {unreadCount === 1 ? "alert" : "alerts"}</strong>
          <span>of {notifications.length} sample notifications</span>
        </div>
        <Link to="/predictions">View prediction signals <span aria-hidden="true">→</span></Link>
      </section>

      <section aria-labelledby="notification-list-heading" className="dashboard-panel notification-list-panel">
        <div className="notification-list-heading">
          <div>
            <h2 id="notification-list-heading">Climate alerts</h2>
            <p>{filter === "unread" ? `${unreadCount} unread alerts` : `${notifications.length} recent alerts`}</p>
          </div>
          <div aria-label="Filter notifications" className="notification-filter-switch" role="group">
            <button
              aria-pressed={filter === "all"}
              className={filter === "all" ? "is-selected" : ""}
              onClick={() => setFilter("all")}
              type="button"
            >
              All
            </button>
            <button
              aria-pressed={filter === "unread"}
              className={filter === "unread" ? "is-selected" : ""}
              onClick={() => setFilter("unread")}
              type="button"
            >
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          </div>
        </div>

        <div className="notification-list">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={markNotificationRead}
              />
            ))
          ) : (
            <div className="notification-empty-state">
              <span><NavIcon name="check" size={20} /></span>
              <strong>{filter === "unread" ? "You’re all caught up" : "No notifications"}</strong>
              <p>{filter === "unread" ? "There are no unread sample alerts to review." : "No climate alerts are available."}</p>
            </div>
          )}
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Alert center</span>
        <span className="data-refresh"><span /> Sample notifications · 03 Nov 2026</span>
      </footer>
    </div>
  );
}
