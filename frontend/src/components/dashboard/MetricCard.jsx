import NavIcon from "../NavIcon.jsx";

export default function MetricCard({ metric }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon-${metric.tone}`}>
        <NavIcon name={metric.icon} size={19} />
      </div>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-value">{metric.value}</div>
      <div className="metric-footnote">
        <span className={`metric-change ${metric.tone === "amber" ? "change-alert" : ""}`}>
          {metric.change}
        </span>
        <span>{metric.detail}</span>
      </div>
    </article>
  );
}
