import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export function homePathForUser(user) {
  return user?.role === "admin" ? "/admin" : "/analyst";
}

export function RequireAuth() {
  const { user, checkingSession } = useAuth();
  const location = useLocation();

  if (checkingSession) {
    return <main className="auth-page"><p role="status">Checking your session…</p></main>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RequireCompletedPasswordChange() {
  const { user } = useAuth();
  if (user.passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

export function RequirePasswordChange({ children }) {
  const { user } = useAuth();
  if (!user.passwordChangeRequired) {
    return <Navigate to={homePathForUser(user)} replace />;
  }
  return children;
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Navigate to={homePathForUser(user)} replace />;
  }
  return children;
}
