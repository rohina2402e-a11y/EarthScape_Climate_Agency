export const metrics = [
  {
    label: "Climate datasets",
    value: "1,284",
    change: "+12.8%",
    detail: "compared to last month",
    icon: "data",
    tone: "green"
  },
  {
    label: "Weather stations",
    value: "248",
    change: "236 active",
    detail: "across 18 regions",
    icon: "globe",
    tone: "blue"
  },
  {
    label: "Sensor records",
    value: "4.82M",
    change: "+8.4%",
    detail: "new records this week",
    icon: "chart",
    tone: "violet"
  },
  {
    label: "Climate anomalies",
    value: "18",
    change: "6 high priority",
    detail: "requiring review",
    icon: "prediction",
    tone: "amber"
  }
];

export const temperatureSeries = {
  "7D": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    observed: [18.4, 19.1, 18.8, 20.2, 21.3, 20.6, 22.1],
    average: [17.6, 17.8, 18.0, 18.1, 18.0, 18.2, 18.4]
  },
  "30D": {
    labels: ["Oct 05", "Oct 10", "Oct 15", "Oct 20", "Oct 25", "Oct 30", "Nov 03"],
    observed: [17.8, 18.6, 19.1, 18.4, 20.3, 19.8, 22.1],
    average: [17.2, 17.4, 17.7, 17.8, 18.0, 18.2, 18.4]
  },
  "90D": {
    labels: ["Aug", "Aug 15", "Sep", "Sep 15", "Oct", "Oct 15", "Nov"],
    observed: [21.4, 20.2, 19.7, 19.2, 18.9, 20.1, 22.1],
    average: [20.8, 20.3, 19.9, 19.4, 18.8, 18.5, 18.4]
  }
};

export const rainfallData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  rainfall: [68, 54, 91, 73, 112, 84],
  previous: [59, 61, 76, 80, 95, 78]
};

export const regionalHighlights = [
  { region: "Pacific Northwest", status: "Above average", amount: "+2.4°C", tone: "warm" },
  { region: "Central Europe", status: "Seasonal range", amount: "+0.6°C", tone: "normal" },
  { region: "South Asia", status: "Rainfall watch", amount: "−18%", tone: "watch" }
];

export const recentAlerts = [
  {
    title: "Elevated temperature anomaly",
    location: "Pacific Northwest · Station PNW-042",
    time: "Today, 09:42 UTC",
    severity: "High"
  },
  {
    title: "Precipitation below seasonal range",
    location: "South Asia · Regional analysis",
    time: "Today, 07:18 UTC",
    severity: "Medium"
  },
  {
    title: "Sensor data quality review",
    location: "Central Europe · Sensor CE-118",
    time: "Yesterday, 21:05 UTC",
    severity: "Low"
  }
];
