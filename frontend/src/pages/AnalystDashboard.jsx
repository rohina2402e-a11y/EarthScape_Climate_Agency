import { Link } from "react-router-dom";
import RainfallChart from "../components/dashboard/RainfallChart.jsx";
import TemperatureChart from "../components/dashboard/TemperatureChart.jsx";
import { analysisInsights, analystMetrics, anomalyReports } from "../data/analystDashboardData.js";

function AnalysisMetric({ metric }) {
  return (
    <article className={`analysis-metric analysis-metric-${metric.tone}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
    </article>
  );
}

function AnomalyReports() {
  return (
    <section aria-labelledby="anomaly-reports-heading" className="dashboard-panel analyst-anomaly-panel">
      <div className="panel-heading">
        <div>
          <h2 id="anomaly-reports-heading">Climate anomaly reports</h2>
          <p>Sample findings for analyst review</p>
        </div>
        <Link className="panel-view-link" to="/predictions">View predictions <span aria-hidden="true">→</span></Link>
      </div>
      <div className="analyst-anomaly-list">
        {anomalyReports.map((report) => (
          <article className="analyst-anomaly-row" key={report.title}>
            <span className={`alert-severity alert-severity-${report.severity.toLowerCase()}`} />
            <div className="analyst-anomaly-copy">
              <strong>{report.title}</strong>
              <span>{report.region} · {report.detail}</span>
            </div>
            <time>{report.date}</time>
            <span className={`severity-label severity-${report.severity.toLowerCase()}`}>{report.severity}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AnalystDashboard() {
  return (
    <div className="admin-dashboard analyst-dashboard">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">CLIMATE RESEARCH <span>·</span> ANALYST WORKSPACE</p>
          <h1>Climate analysis</h1>
          <p>Explore observed trends and review notable climate signals.</p>
        </div>
        <Link className="dashboard-date-button" to="/data">
          <span aria-hidden="true">▤</span>
          <span>Explore datasets</span>
          <span className="date-caret" aria-hidden="true">→</span>
        </Link>
      </header>

      <div className="sample-data-banner">
        <span className="sample-data-indicator" />
        Analyst workspace preview uses illustrative sample climate data.
      </div>

      <section aria-label="Analysis summary" className="analysis-metric-grid">
        {analystMetrics.map((metric) => <AnalysisMetric key={metric.label} metric={metric} />)}
      </section>

      <div className="dashboard-chart-grid">
        <TemperatureChart />
        <RainfallChart />
      </div>

      <section aria-labelledby="analysis-insights-heading" className="analyst-insights">
        <div>
          <p className="eyebrow">OBSERVATIONS</p>
          <h2 id="analysis-insights-heading">Signals to keep in view</h2>
        </div>
        <ul>
          {analysisInsights.map((insight) => <li key={insight}>{insight}</li>)}
        </ul>
      </section>

      <AnomalyReports />
      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Analyst workspace</span>
        <span className="data-refresh"><span /> Sample data snapshot · 10:30 UTC</span>
      </footer>
    </div>
  );
}
