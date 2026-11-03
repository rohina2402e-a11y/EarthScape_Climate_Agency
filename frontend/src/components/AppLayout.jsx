import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { apiRequest } from "../services/api.js";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

export default function AppLayout({ sections }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const { pathname } = useLocation();
  const currentSection = sections.find((section) => `/${section.path}` === pathname);
  const title = pathname === "/" ? "Home" : currentSection?.title ?? "Workspace";
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  const refreshNotifications = useCallback(async () => {
    const { alerts } = await apiRequest("/api/alerts");
    setNotifications(alerts.map((alert) => ({
      ...alert,
      severity: alert.severity[0].toUpperCase() + alert.severity.slice(1),
      date: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC"
      }).format(new Date(alert.createdAt)) + " UTC"
    })));
    setNotificationError("");
  }, []);

  useEffect(() => {
    refreshNotifications().catch((error) => setNotificationError(error.message));
  }, [refreshNotifications]);

  async function markNotificationRead(notificationId) {
    try {
      await apiRequest(`/api/alerts/${notificationId}`, {
        method: "PUT",
        body: JSON.stringify({ read: true })
      });
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId ? { ...notification, read: true } : notification
      )));
      setNotificationError("");
    } catch (error) {
      setNotificationError(error.message);
    }
  }

  async function markAllNotificationsRead() {
    const unread = notifications.filter((notification) => !notification.read);
    const outcomes = await Promise.allSettled(unread.map((notification) => apiRequest(
      `/api/alerts/${notification.id}`,
      { method: "PUT", body: JSON.stringify({ read: true }) }
    )));
    const succeededIds = new Set(
      unread.filter((_notification, index) => outcomes[index].status === "fulfilled")
        .map((notification) => notification.id)
    );
    setNotifications((current) => current.map((notification) => (
      succeededIds.has(notification.id) ? { ...notification, read: true } : notification
    )));
    const failure = outcomes.find((outcome) => outcome.status === "rejected");
    setNotificationError(failure ? failure.reason.message : "");
  }

  return (
    <div className="app-frame">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="app-main">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="main-content">
          <Outlet context={{
            notifications,
            notificationError,
            refreshNotifications,
            markNotificationRead,
            markAllNotificationsRead
          }} />
        </main>
      </div>
    </div>
  );
}
