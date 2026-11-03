import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AnalystDashboard from "./pages/AnalystDashboard.jsx";
import ClimateDataPage from "./pages/ClimateDataPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import SectionPlaceholder from "./pages/SectionPlaceholder.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import SupportPage from "./pages/SupportPage.jsx";

const ClimateVisualizationsPage = lazy(() => import("./pages/ClimateVisualizationsPage.jsx"));

const sections = [
  { path: "admin", title: "Admin dashboard", description: "Organization overview and data operations." },
  { path: "analyst", title: "Analyst workspace", description: "Climate analysis and research workspace." },
  { path: "data", title: "Climate data", description: "Dataset imports and source management." },
  { path: "visualizations", title: "Visualizations", description: "Climate charts and geographic views." },
  { path: "predictions", title: "Predictions", description: "Forecasts and anomaly detection." },
  { path: "notifications", title: "Notifications", description: "Climate alerts and updates." },
  { path: "support", title: "Feedback & support", description: "Feedback and technical support requests." },
  { path: "login", title: "Sign in", description: "Secure access for EarthScape team members." }
];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout sections={sections} />}>
          <Route
            index
            element={
              <SectionPlaceholder
                eyebrow="EARTHSCAPE CLIMATE AGENCY"
                title="A clearer view of our changing climate."
                description="Your climate monitoring workspace brings trusted observations, analysis, and insights together."
                sections={sections}
                welcome
              />
            }
          />
          {sections.map((section) => (
            <Route
              key={section.path}
              path={section.path}
              element={
                section.path === "admin" ? <AdminDashboard />
                  : section.path === "analyst" ? <AnalystDashboard />
                    : section.path === "data" ? <ClimateDataPage />
                  : section.path === "visualizations" ? (
                    <Suspense fallback={<p className="visualization-loading" role="status">Loading climate visualizations…</p>}>
                      <ClimateVisualizationsPage />
                    </Suspense>
                  )
                  : section.path === "predictions" ? <PredictionsPage />
                  : section.path === "notifications" ? <NotificationsPage />
                  : section.path === "support" ? <SupportPage />
                  : (
                  <SectionPlaceholder
                    eyebrow="YOUR CLIMATE WORKSPACE"
                    title={section.title}
                    description={section.description}
                  />
                    )
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
