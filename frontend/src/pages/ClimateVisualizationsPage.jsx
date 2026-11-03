import { useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { CircleMarker, MapContainer, TileLayer, Tooltip as MapTooltip } from "react-leaflet";
import NavIcon from "../components/NavIcon.jsx";
import { climateStations, regionalRainfall, regionalTemperatureSeries, visualizationMonths } from "../data/visualizationData.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const chartLegend = {
  position: "bottom",
  align: "start",
  labels: {
    usePointStyle: true,
    pointStyle: "circle",
    boxWidth: 7,
    boxHeight: 7,
    padding: 16,
    color: "#7b8995",
    font: { family: "DM Sans", size: 10 }
  }
};

const chartScales = {
  x: {
    grid: { display: false },
    border: { display: false },
    ticks: { color: "#9aa6b0", font: { family: "DM Sans", size: 10 }, maxRotation: 0 }
  },
  y: {
    border: { display: false },
    grid: { color: "#edf0f2", drawTicks: false },
    ticks: { color: "#9aa6b0", font: { family: "DM Sans", size: 10 }, padding: 8 }
  }
};

function TemperatureTrendChart() {
  const data = useMemo(() => ({
    labels: visualizationMonths,
    datasets: regionalTemperatureSeries.map((series) => ({
      label: series.region,
      data: series.values,
      borderColor: series.color,
      backgroundColor: series.color,
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 2.5,
      pointHoverRadius: 5
    }))
  }), []);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: chartLegend,
      tooltip: {
        backgroundColor: "#1d384b",
        padding: 10,
        callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C` }
      }
    },
    scales: {
      ...chartScales,
      y: { ...chartScales.y, title: { display: true, text: "°C", color: "#8c99a3", font: { size: 10 } } }
    }
  }), []);

  return <Line aria-label="Temperature trends for three climate regions" data={data} options={options} />;
}

function RainfallComparisonChart() {
  const data = {
    labels: regionalRainfall.labels,
    datasets: [
      {
        label: "Current period",
        data: regionalRainfall.current,
        backgroundColor: "#4b8aa1",
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.58
      },
      {
        label: "Seasonal average",
        data: regionalRainfall.average,
        backgroundColor: "#dce6e9",
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.58
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: chartLegend,
      tooltip: {
        backgroundColor: "#1d384b",
        padding: 10,
        callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} mm` }
      }
    },
    scales: {
      ...chartScales,
      y: {
        ...chartScales.y,
        beginAtZero: true,
        title: { display: true, text: "mm", color: "#8c99a3", font: { size: 10 } }
      }
    }
  };
  return <Bar aria-label="Regional rainfall compared with seasonal average" data={data} options={options} />;
}

function ClimateMap() {
  const [layer, setLayer] = useState("temperature");
  const metric = layer === "temperature"
    ? { label: "Temperature", unit: "°C", color: (station) => station.severity === "high" ? "#d67862" : "#43835f" }
    : { label: "Rainfall", unit: "mm", color: (station) => station.severity === "high" ? "#d67862" : "#4b8aa1" };

  return (
    <section aria-labelledby="map-heading" className="dashboard-panel climate-map-panel">
      <div className="map-panel-heading">
        <div>
          <h2 id="map-heading">Global station map</h2>
          <p>Illustrative observations by monitoring location</p>
        </div>
        <div aria-label="Map data layer" className="map-layer-switch" role="group">
          {["temperature", "rainfall"].map((item) => (
            <button
              aria-pressed={layer === item}
              className={layer === item ? "is-selected" : ""}
              key={item}
              onClick={() => setLayer(item)}
              type="button"
            >
              {item === "temperature" ? "Temperature" : "Rainfall"}
            </button>
          ))}
        </div>
      </div>
      <div className="climate-map-wrap">
        <MapContainer center={[25, 5]} zoom={2} scrollWheelZoom={false} aria-label="Interactive map showing sample climate station locations">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {climateStations.map((station) => (
            <CircleMarker
              center={station.coordinates}
              key={station.name}
              pathOptions={{
                color: "#fff",
                fillColor: metric.color(station),
                fillOpacity: 0.88,
                weight: 2
              }}
              radius={station.severity === "high" ? 9 : 7}
            >
              <MapTooltip>
                <strong>{station.name}</strong><br />
                {station.region}<br />
                {metric.label}: {station[layer]} {metric.unit}
              </MapTooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="climate-map-legend">
        <span><i className="map-legend-dot map-legend-normal" /> Sample station</span>
        <span><i className="map-legend-dot map-legend-high" /> Anomaly review</span>
        <span>Hover or select a marker for details</span>
      </div>
    </section>
  );
}

export default function ClimateVisualizationsPage() {
  return (
    <div className="admin-dashboard climate-visualizations-page">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">CLIMATE INTELLIGENCE <span>·</span> VISUAL EXPLORER</p>
          <h1>Climate visualizations</h1>
          <p>Compare regional trends and explore sample monitoring locations.</p>
        </div>
        <div className="visualization-period">
          <NavIcon name="calendar" size={15} />
          <span>May – October 2026</span>
        </div>
      </header>

      <div className="sample-data-banner">
        <span className="sample-data-indicator" />
        Charts and station locations use illustrative data; they are not live environmental measurements.
      </div>

      <ClimateMap />

      <div className="dashboard-chart-grid visualization-chart-grid">
        <section aria-labelledby="regional-temperature-heading" className="dashboard-panel visualization-chart-panel">
          <div className="panel-heading">
            <div>
              <h2 id="regional-temperature-heading">Regional temperature trends</h2>
              <p>Monthly surface temperature · °C</p>
            </div>
          </div>
          <div className="visualization-chart-wrap"><TemperatureTrendChart /></div>
        </section>
        <section aria-labelledby="rainfall-comparison-heading" className="dashboard-panel visualization-chart-panel">
          <div className="panel-heading">
            <div>
              <h2 id="rainfall-comparison-heading">Rainfall comparison</h2>
              <p>Current period vs. seasonal average · mm</p>
            </div>
          </div>
          <div className="visualization-chart-wrap"><RainfallComparisonChart /></div>
        </section>
      </div>

      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Climate visual explorer</span>
        <span className="data-refresh"><span /> Sample data snapshot · 03 Nov 2026</span>
      </footer>
    </div>
  );
}
