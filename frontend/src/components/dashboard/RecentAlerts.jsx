import { Link } from "react-router-dom";
import { recentAlerts } from "../../data/adminDashboardData.js";
import NavIcon from "../NavIcon.jsx";

export default function RecentAlerts() {
  return (
    <section aria-labelledby="alerts-heading" className="dashboard-panel alerts-panel">
      <div className="panel-heading">
        <div>
          <h2 id="alerts-heading">Recent climate alerts</h2>
          <p>Latest activity across monitored regions</p>
        </div>
        <Link className="panel-view-link" to="/notifications">
          View all <NavIcon name="arrow" size={15} />
        </Link>
      </div>
      <div className="alert-list">
        {recentAlerts.map((alert) => (
          <article className="alert-row" key={alert.title}>
            <span className={`alert-severity alert-severity-${alert.severity.toLowerCase()}`} />
            <div className="alert-copy">
              <strong>{alert.title}</strong>
              <span>{alert.location}</span>
              <time>{alert.time}</time>
            </div>
            <span className={`severity-label severity-${alert.severity.toLowerCase()}`}>
              {alert.severity}
            </span>
          </article>
        ))}
      </div>
      <div className="alerts-footnote">
        <NavIcon name="shield" size={15} />
        Alerts are illustrative sample data for this frontend preview.
      </div>
    </section>
  );
}
