import { regionalHighlights } from "../../data/adminDashboardData.js";
import NavIcon from "../NavIcon.jsx";

export default function RegionHighlights() {
  return (
    <section aria-labelledby="regional-heading" className="dashboard-panel region-panel">
      <div className="panel-heading">
        <div>
          <h2 id="regional-heading">Regional overview</h2>
          <p>Climate conditions by region</p>
        </div>
        <NavIcon className="region-panel-icon" name="globe" size={18} />
      </div>
      <div className="region-summary">
        <div className="region-globe"><NavIcon name="globe" size={48} /></div>
        <div>
          <strong>18 regions</strong>
          <span>reporting data today</span>
        </div>
        <span className="region-online-dot" />
      </div>
      <div className="region-list">
        {regionalHighlights.map((item) => (
          <div className="region-row" key={item.region}>
            <span className={`region-status-dot status-dot-${item.tone}`} />
            <span className="region-name">{item.region}</span>
            <span className="region-condition">{item.status}</span>
            <strong className={`region-value region-value-${item.tone}`}>{item.amount}</strong>
          </div>
        ))}
      </div>
      <div className="region-note">
        <span>●</span> Sample monitoring data
      </div>
    </section>
  );
}
