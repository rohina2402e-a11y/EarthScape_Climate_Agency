import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  CategoryScale,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";
import { temperatureSeries } from "../../data/adminDashboardData.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ranges = ["7D", "30D", "90D"];

export default function TemperatureChart() {
  const [range, setRange] = useState("30D");
  const series = temperatureSeries[range];
  const data = useMemo(() => ({
    labels: series.labels,
    datasets: [
      {
        label: "Observed temperature",
        data: series.observed,
        borderColor: "#2b805f",
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "rgba(43, 128, 95, 0.12)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(43, 128, 95, 0.20)");
          gradient.addColorStop(1, "rgba(43, 128, 95, 0.01)");
          return gradient;
        },
        fill: true,
        tension: 0.38,
        borderWidth: 2.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#2b805f",
        pointBorderWidth: 2
      },
      {
        label: "Seasonal average",
        data: series.average,
        borderColor: "#a7b3bd",
        borderDash: [5, 5],
        tension: 0.35,
        borderWidth: 1.8,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false
      }
    ]
  }), [series]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        align: "start",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 7,
          boxHeight: 7,
          padding: 20,
          color: "#7b8995",
          font: { family: "DM Sans", size: 11 }
        }
      },
      tooltip: {
        backgroundColor: "#1d384b",
        padding: 11,
        titleFont: { family: "DM Sans", size: 11 },
        bodyFont: { family: "DM Sans", size: 11 },
        callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#9aa6b0", font: { family: "DM Sans", size: 10 }, maxRotation: 0 }
      },
      y: {
        min: 12,
        max: 26,
        border: { display: false, dash: [3, 4] },
        grid: { color: "#edf0f2", drawTicks: false },
        ticks: {
          stepSize: 4,
          padding: 10,
          color: "#9aa6b0",
          font: { family: "DM Sans", size: 10 },
          callback: (value) => `${value}°`
        }
      }
    }
  }), []);

  return (
    <section aria-labelledby="temperature-heading" className="dashboard-panel temperature-panel">
      <div className="panel-heading">
        <div>
          <h2 id="temperature-heading">Temperature overview</h2>
          <p>Global surface temperature · °C</p>
        </div>
        <div aria-label="Temperature date range" className="range-switch" role="group">
          {ranges.map((item) => (
            <button
              aria-pressed={range === item}
              className={range === item ? "is-selected" : ""}
              key={item}
              onClick={() => setRange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-stat">
        <strong>22.1°C</strong>
        <span className="chart-stat-up">↗ 1.8°</span>
        <span>vs. seasonal average</span>
      </div>
      <div className="temperature-chart-wrap">
        <Line aria-label={`Observed temperatures for the last ${range}`} data={data} options={options} />
      </div>
    </section>
  );
}
