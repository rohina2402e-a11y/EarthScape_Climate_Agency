import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import NavIcon from "../components/NavIcon.jsx";
import { apiRequest } from "../services/api.js";

function NotificationCard({ notification, onMarkRead, onDelete, canManage }) {
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
      {canManage && (
        <button
          aria-label={`Delete ${notification.title}`}
          className="notification-delete"
          onClick={() => onDelete(notification)}
          type="button"
        >
          Delete
        </button>
      )}
    </article>
  );
}

function AlertCreateForm({ onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    category: "Temperature",
    severity: "medium"
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/alerts", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", description: "", location: "", category: "Temperature", severity: "medium" });
      await onCreated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="create-alert-heading" className="dashboard-panel alert-create-panel">
      <h2 id="create-alert-heading">Create climate alert</h2>
      {error && <p className="alert-create-error" role="alert">{error}</p>}
      <form className="alert-create-form" onSubmit={submit}>
        <label>Title<input maxLength={160} name="title" onChange={updateField} required value={form.title} /></label>
        <label>Location<input maxLength={200} name="location" onChange={updateField} required value={form.location} /></label>
        <label>Category<input maxLength={80} name="category" onChange={updateField} required value={form.category} /></label>
        <label>Severity
          <select name="severity" onChange={updateField} value={form.severity}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="alert-create-description">Details
          <textarea maxLength={2000} name="description" onChange={updateField} rows={2} value={form.description} />
        </label>
        <button className="notifications-mark-all" disabled={saving} type="submit">
          {saving ? "Creating…" : "Create alert"}
        </button>
      </form>
    </section>
  );
}

export default function NotificationsPage() {
  const {
    notifications,
    notificationError,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead
  } = useOutletContext();
  const { user } = useAuth();
  const canManage = user.role === "admin";
  const [filter, setFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => filter === "all" || !notification.read),
    [filter, notifications]
  );

  async function deleteAlert(notification) {
    if (!window.confirm(`Delete the alert "${notification.title}"?`)) return;
    try {
      await apiRequest(`/api/alerts/${notification.id}`, { method: "DELETE" });
      await refreshNotifications();
      setActionError("");
    } catch (error) {
      setActionError(error.message);
    }
  }

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

      {(notificationError || actionError) && (
        <div className="alert alert-danger" role="alert">{actionError || notificationError}</div>
      )}

      {canManage && <AlertCreateForm onCreated={refreshNotifications} />}

      <section aria-label="Notification summary" className="notification-summary">
        <div className="notification-summary-icon"><NavIcon name="bell" size={19} /></div>
        <div>
          <strong>{unreadCount} unread {unreadCount === 1 ? "alert" : "alerts"}</strong>
          <span>of {notifications.length} climate alerts</span>
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
                onDelete={deleteAlert}
                canManage={canManage}
              />
            ))
          ) : (
            <div className="notification-empty-state">
              <span><NavIcon name="check" size={20} /></span>
              <strong>{filter === "unread" ? "You’re all caught up" : "No notifications"}</strong>
              <p>{filter === "unread" ? "There are no unread alerts to review." : "No climate alerts are available."}</p>
            </div>
          )}
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Alert center</span>
        <span className="data-refresh"><span /> Live alerts · Express API</span>
      </footer>
    </div>
  );
}
