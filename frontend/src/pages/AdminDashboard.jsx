import { Link } from "react-router-dom";
import MetricCard from "../components/dashboard/MetricCard.jsx";
import RainfallChart from "../components/dashboard/RainfallChart.jsx";
import RecentAlerts from "../components/dashboard/RecentAlerts.jsx";
import RegionHighlights from "../components/dashboard/RegionHighlights.jsx";
import TemperatureChart from "../components/dashboard/TemperatureChart.jsx";
import NavIcon from "../components/NavIcon.jsx";
import { metrics } from "../data/adminDashboardData.js";

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">MONDAY, NOVEMBER 03, 2026 <span>·</span> GLOBAL MONITORING</p>
          <h1>Good morning, EarthScape</h1>
          <p>Here&apos;s your climate monitoring overview for today.</p>
        </div>
        <Link className="dashboard-date-button" to="/data">
          <NavIcon name="calendar" size={16} />
          <span>Last 30 days</span>
          <span className="date-caret">⌄</span>
        </Link>
      </header>

      <div className="sample-data-banner">
        <span className="sample-data-indicator" />
        Dashboard preview uses illustrative sample climate data.
      </div>

      <section aria-label="Climate monitoring summary" className="metric-grid">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <div className="dashboard-chart-grid">
        <TemperatureChart />
        <RainfallChart />
      </div>

      <div className="dashboard-detail-grid">
        <RegionHighlights />
        <RecentAlerts />
      </div>

      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Monitoring the signals that shape our future</span>
        <span className="data-refresh"><span /> Sample data snapshot · 10:30 UTC</span>
      </footer>
    </div>
  );
}
