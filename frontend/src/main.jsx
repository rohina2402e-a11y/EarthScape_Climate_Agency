import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/main-layout.css";
import "./styles/admin-dashboard.css";
import "./styles/analyst-dashboard.css";
import "./styles/climate-data.css";
import "leaflet/dist/leaflet.css";
import "./styles/climate-visualizations.css";
import "./styles/predictions.css";
import "./styles/notifications.css";
import "./styles/support.css";
import "./styles/auth.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
