export const initialClimateDatasets = [
  {
    id: "dataset-001",
    name: "Pacific Northwest temperature observations",
    source: "Weather station",
    type: "CSV",
    date: "03 Nov 2026",
    status: "Processed",
    records: "24,680"
  },
  {
    id: "dataset-002",
    name: "Global precipitation grid · October",
    source: "Satellite",
    type: "NetCDF",
    date: "02 Nov 2026",
    status: "Processed",
    records: "18,240"
  },
  {
    id: "dataset-003",
    name: "Central Europe air quality sensors",
    source: "Environmental sensor",
    type: "CSV",
    date: "01 Nov 2026",
    status: "Under review",
    records: "8,512"
  },
  {
    id: "dataset-004",
    name: "South Asia rainfall summary",
    source: "Weather station",
    type: "JSON",
    date: "30 Oct 2026",
    status: "Processed",
    records: "12,906"
  },
  {
    id: "dataset-005",
    name: "Arctic sea ice surface readings",
    source: "Satellite",
    type: "CSV",
    date: "28 Oct 2026",
    status: "Needs attention",
    records: "6,184"
  },
  {
    id: "dataset-006",
    name: "Amazon basin humidity sensors",
    source: "Environmental sensor",
    type: "CSV",
    date: "26 Oct 2026",
    status: "Processed",
    records: "9,370"
  }
];

export const climateSources = [
  "Satellite",
  "Weather station",
  "Environmental sensor"
];
