import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { rainfallData } from "../../data/adminDashboardData.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const data = {
  labels: rainfallData.labels,
  datasets: [
    {
      label: "This year",
      data: rainfallData.rainfall,
      backgroundColor: "#4b8aa1",
      borderRadius: 4,
      borderSkipped: false,
      barPercentage: 0.58,
      categoryPercentage: 0.7
    },
    {
      label: "Previous year",
      data: rainfallData.previous,
      backgroundColor: "#dce6e9",
      borderRadius: 4,
      borderSkipped: false,
      barPercentage: 0.58,
      categoryPercentage: 0.7
    }
  ]
};

const options = {
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
        padding: 18,
        color: "#7b8995",
        font: { family: "DM Sans", size: 10 }
      }
    },
    tooltip: {
      backgroundColor: "#1d384b",
      padding: 10,
      titleFont: { family: "DM Sans", size: 11 },
      bodyFont: { family: "DM Sans", size: 11 },
      callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} mm` }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#9aa6b0", font: { family: "DM Sans", size: 10 } }
    },
    y: {
      beginAtZero: true,
      max: 140,
      border: { display: false },
      grid: { color: "#edf0f2", drawTicks: false },
      ticks: {
        stepSize: 35,
        padding: 8,
        color: "#9aa6b0",
        font: { family: "DM Sans", size: 10 },
        callback: (value) => `${value}`
      }
    }
  }
};

export default function RainfallChart() {
  return (
    <section aria-labelledby="rainfall-heading" className="dashboard-panel rainfall-panel">
      <div className="panel-heading">
        <div>
          <h2 id="rainfall-heading">Rainfall statistics</h2>
          <p>Monthly precipitation · mm</p>
        </div>
        <button aria-label="Rainfall chart options" className="panel-more" type="button">···</button>
      </div>
      <div className="chart-stat">
        <strong>482 mm</strong>
        <span className="chart-stat-up chart-stat-blue">↗ 6.2%</span>
        <span>year to date</span>
      </div>
      <div className="rainfall-chart-wrap">
        <Bar aria-label="Monthly rainfall compared to previous year" data={data} options={options} />
      </div>
    </section>
  );
}
