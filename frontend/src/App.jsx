import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import {
  homePathForUser,
  RequireAuth,
  RequireCompletedPasswordChange,
  RequirePasswordChange,
  RequireRole
} from "./auth/ProtectedRoutes.jsx";
import AppLayout from "./components/AppLayout.jsx";
import LoginPage from "./components/LoginPage.jsx";
import PasswordPanel from "./components/PasswordPanel.jsx";
import RegistrationPage from "./components/RegistrationPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AnalystDashboard from "./pages/AnalystDashboard.jsx";
import ClimateDataPage from "./pages/ClimateDataPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import SupportPage from "./pages/SupportPage.jsx";

const ClimateVisualizationsPage = lazy(() => import("./pages/ClimateVisualizationsPage.jsx"));

const sections = [
  { path: "admin", title: "Admin dashboard" },
  { path: "analyst", title: "Analyst workspace" },
  { path: "data", title: "Climate data" },
  { path: "visualizations", title: "Visualizations" },
  { path: "predictions", title: "Predictions" },
  { path: "notifications", title: "Notifications" },
  { path: "support", title: "Feedback & support" }
];

function PublicLogin() {
  const { user, checkingSession, authMessage, setAuthMessage, setUser } = useAuth();
  const location = useLocation();

  if (checkingSession) {
    return <main className="auth-page"><p role="status">Checking your session…</p></main>;
  }
  if (user) return <Navigate to={homePathForUser(user)} replace />;

  const message = location.state?.message || authMessage;
  return (
    <LoginPage
      message={message}
      onLogin={(nextUser) => {
        setAuthMessage("");
        setUser(nextUser);
      }}
    />
  );
}

function PublicRegistration() {
  const { user, checkingSession } = useAuth();
  if (checkingSession) {
    return <main className="auth-page"><p role="status">Checking your session…</p></main>;
  }
  return user ? <Navigate to={homePathForUser(user)} replace /> : <RegistrationPage />;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePathForUser(user)} replace />;
}

function PasswordChangePage() {
  const { clearLocalSession } = useAuth();
  const navigate = useNavigate();
  const message = "Password changed. Sign in again with your new password.";

  function finishPasswordChange() {
    clearLocalSession(message);
    navigate("/login", { replace: true, state: { message } });
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1 className="h3">Update your password</h1>
        <p className="auth-description">Change the temporary password before continuing to the workspace.</p>
        <PasswordPanel forced onChanged={finishPasswordChange} />
      </section>
    </main>
  );
}

function WorkspaceRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicLogin />} />
      <Route path="/register" element={<PublicRegistration />} />
      <Route element={<RequireAuth />}>
        <Route
          path="/change-password"
          element={(
            <RequirePasswordChange>
              <PasswordChangePage />
            </RequirePasswordChange>
          )}
        />
        <Route element={<RequireCompletedPasswordChange />}>
          <Route element={<AppLayout sections={sections} />}>
            <Route index element={<HomeRedirect />} />
            <Route
              path="admin"
              element={<RequireRole roles={["admin"]}><AdminDashboard /></RequireRole>}
            />
            <Route
              path="analyst"
              element={<RequireRole roles={["analyst"]}><AnalystDashboard /></RequireRole>}
            />
            <Route path="data" element={<ClimateDataPage />} />
            <Route
              path="visualizations"
              element={(
                <Suspense fallback={<p className="visualization-loading" role="status">Loading climate visualizations…</p>}>
                  <ClimateVisualizationsPage />
                </Suspense>
              )}
            />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <WorkspaceRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
