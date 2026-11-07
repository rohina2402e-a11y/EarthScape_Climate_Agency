export const visualizationMonths = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export const regionalTemperatureSeries = [
  { region: "Pacific Northwest", values: [17.2, 18.1, 19.3, 20.5, 19.8, 22.1], color: "#2b805f" },
  { region: "Central Europe", values: [15.4, 17.1, 18.8, 19.2, 17.9, 18.6], color: "#4b8aa1" },
  { region: "South Asia", values: [27.2, 28.1, 29.4, 29.0, 28.3, 28.7], color: "#c58c49" }
];

export const regionalRainfall = {
  labels: ["Pacific NW", "Central Europe", "South Asia", "Amazon Basin", "Arctic"],
  current: [86, 62, 48, 132, 71],
  average: [74, 69, 79, 119, 65]
};

export const climateStations = [
  { name: "Vancouver", region: "Pacific Northwest", coordinates: [49.2827, -123.1207], temperature: 18.4, rainfall: 86, severity: "normal" },
  { name: "Seattle", region: "Pacific Northwest", coordinates: [47.6062, -122.3321], temperature: 22.1, rainfall: 74, severity: "high" },
  { name: "Berlin", region: "Central Europe", coordinates: [52.52, 13.405], temperature: 18.6, rainfall: 62, severity: "normal" },
  { name: "Paris", region: "Central Europe", coordinates: [48.8566, 2.3522], temperature: 19.4, rainfall: 68, severity: "normal" },
  { name: "Mumbai", region: "South Asia", coordinates: [19.076, 72.8777], temperature: 28.7, rainfall: 48, severity: "high" },
  { name: "Delhi", region: "South Asia", coordinates: [28.6139, 77.209], temperature: 30.1, rainfall: 42, severity: "high" },
  { name: "Manaus", region: "Amazon Basin", coordinates: [-3.119, -60.0217], temperature: 27.8, rainfall: 132, severity: "normal" },
  { name: "Nuuk", region: "Arctic", coordinates: [64.1814, -51.6941], temperature: 2.8, rainfall: 71, severity: "watch" }
];
