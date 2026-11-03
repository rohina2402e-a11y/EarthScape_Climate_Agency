import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { initialNotifications } from "../data/notificationsData.js";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

export default function AppLayout({ sections }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const { pathname } = useLocation();
  const currentSection = sections.find((section) => `/${section.path}` === pathname);
  const title = pathname === "/" ? "Home" : currentSection?.title ?? "Workspace";
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  function markNotificationRead(notificationId) {
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )));
  }

  function markAllNotificationsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
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
          <Outlet context={{ notifications, markNotificationRead, markAllNotificationsRead }} />
        </main>
      </div>
    </div>
  );
}
