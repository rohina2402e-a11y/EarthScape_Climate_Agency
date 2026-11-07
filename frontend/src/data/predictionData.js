export const predictionHorizons = [3, 6, 12];

export const temperatureForecast = {
  historicalLabels: ["Jun", "Jul", "Aug", "Sep", "Oct"],
  historical: [18.1, 19.3, 20.5, 19.8, 22.1],
  forecastLabels: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  forecast: [20.8, 18.7, 17.2, 17.9, 19.1, 20.6, 21.7, 22.4, 23.1, 22.8, 21.9, 23.5]
};

export const rainfallForecast = {
  historicalLabels: ["Jun", "Jul", "Aug", "Sep", "Oct"],
  historical: [82, 91, 73, 112, 84],
  forecastLabels: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  forecast: [76, 68, 61, 58, 72, 81, 93, 88, 104, 96, 89, 107]
};

export const predictionAnomalies = [
  {
    title: "Elevated temperature likelihood",
    region: "Pacific Northwest",
    description: "Forecast temperatures trend above the sample seasonal baseline.",
    probability: "78%",
    severity: "High"
  },
  {
    title: "Below-average rainfall signal",
    region: "South Asia",
    description: "The illustrative outlook indicates a possible seasonal precipitation deficit.",
    probability: "64%",
    severity: "Medium"
  },
  {
    title: "Rapid temperature shift",
    region: "Central Europe",
    description: "A short-term change is flagged for additional analyst review.",
    probability: "42%",
    severity: "Low"
  }
];
