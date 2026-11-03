# Frontend phase: application layout

This frontend step includes the responsive shell and seven completed pages: Admin Dashboard, Analyst Dashboard, Climate Data, Climate Visualizations, Predictions, Notifications, and Feedback & Support. All use illustrative sample climate data or local preview state. No page in this frontend phase sends requests to the backend, MongoDB, or machine-learning services.

## Files created or updated

- `frontend/src/App.jsx` — browser routes.
- `frontend/src/components/AppLayout.jsx` — shared page frame and responsive menu state.
- `frontend/src/components/Sidebar.jsx` — navigation groups and active link styles.
- `frontend/src/components/TopBar.jsx` — page breadcrumb, notification shortcut, and sample user.
- `frontend/src/components/NavIcon.jsx` — small reusable inline icons.
- `frontend/src/pages/SectionPlaceholder.jsx` — welcome screen and temporary route placeholders.
- `frontend/src/pages/AdminDashboard.jsx` — Admin Dashboard page composition.
- `frontend/src/pages/AnalystDashboard.jsx` — Analyst Dashboard page composition, analysis insights, and anomaly reports.
- `frontend/src/pages/ClimateDataPage.jsx` — sample climate-data catalog, search and filters, and local file-selection preview.
- `frontend/src/pages/ClimateVisualizationsPage.jsx` — regional comparison charts and interactive Leaflet station map.
- `frontend/src/pages/PredictionsPage.jsx` — illustrative temperature and rainfall forecast charts, horizon selector, and anomaly-review signals.
- `frontend/src/pages/NotificationsPage.jsx` — sample climate-alert list, severity filters, and local read-status controls.
- `frontend/src/pages/SupportPage.jsx` — feedback/technical-issue form and sample support-request status list with local submissions.
- `frontend/src/components/dashboard/` — reusable metric cards, charts, regional highlights, and alerts.
- `frontend/src/data/adminDashboardData.js` — illustrative dashboard data.
- `frontend/src/data/analystDashboardData.js` — illustrative analyst metrics, observations, and anomaly reports.
- `frontend/src/data/climateDatasets.js` — illustrative catalog entries and source types.
- `frontend/src/data/visualizationData.js` — illustrative regional trends and map station observations.
- `frontend/src/data/predictionData.js` — illustrative historical/forecast series and sample anomaly signals.
- `frontend/src/data/notificationsData.js` — illustrative alert entries and initial read statuses.
- `frontend/src/data/supportData.js` — illustrative request history and feedback categories.
- `frontend/src/styles/admin-dashboard.css` — dashboard layout and responsive styles.
- `frontend/src/styles/analyst-dashboard.css` — analyst-specific styling and responsive adjustments.
- `frontend/src/styles/climate-data.css` — catalog, upload-preview, table, and responsive styles.
- `frontend/src/styles/climate-visualizations.css` — map, charts, controls, and responsive styles.
- `frontend/src/styles/predictions.css` — forecast cards, charts, anomaly list, and responsive styles.
- `frontend/src/styles/notifications.css` — alert cards, read controls, severity styles, and responsive layout.
- `frontend/src/styles/support.css` — support form, guidance, request status list, and responsive styles.
- `frontend/src/styles/main-layout.css` — layout, color palette, typography, and responsive styles.
- `frontend/src/main.jsx` — imports Bootstrap and the new layout stylesheet.
- `frontend/package.json` — includes Chart.js and its React wrapper for interactive charts.

## Run in VS Code

1. Open the existing `EarthScape_Climate_Agency` repository in VS Code.
2. Select **Terminal → New Terminal**. The terminal starts in the repository root.
3. Run:

   ```powershell
   Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\frontend
   npm install
   npm run dev
   ```

4. Open the local URL Vite prints, usually `http://localhost:5173`.

If dependencies are already installed, you can skip `npm install`. To stop Vite, focus the terminal running it and press **Ctrl+C**.

## What to check

- On a wide screen, the navigation stays visible on the left.
- On a narrow screen, select the menu icon to open the sidebar and select the shaded area or a link to close it.
- The Admin dashboard link opens `/admin`; the Analyst workspace link opens `/analyst`.
- Both dashboards have interactive temperature charts with 7D, 30D, and 90D controls, as well as rainfall charts with hover tooltips.
- Climate data opens `/data`, where the catalog supports search and source/status filtering. File selection adds CSV/JSON files to a local preview queue only; it does not upload or process them.
- Visualizations opens `/visualizations`, with regional temperature and rainfall comparisons and a Leaflet map whose temperature/rainfall layers and station tooltips are interactive.
- The interactive map uses OpenStreetMap tiles and displays its required attribution; an internet connection is needed to load the map background.
- Predictions opens `/predictions` with illustrative temperature/rainfall outlooks and sample anomaly signals. Its 3/6/12-month selector updates the chart horizon; the forecast values are not generated by a trained model.
- Notifications opens `/notifications`, where sample climate alerts can be filtered and marked read individually or all at once. The unread count is reflected in the sidebar and notification shortcut, but state is local and resets when the app is reloaded.
- Feedback & support opens `/support`, with a feedback/issue form and request-status list. Submitting adds a local preview entry only; nothing is sent to support or saved after reload.
- Login still shows a placeholder and will be implemented separately.
- Dashboard numbers, findings, and chart data are examples for the frontend preview, not live agency measurements.
- No dashboard, catalog, forecast, notifications, or support page makes network requests to the backend.

To check a production build, run this from the `frontend/` folder:

```powershell
npm run build
```

Expected output ends with `built in ...` and reports generated files under `dist/`.

## Troubleshooting

- **`npm` or `node` is not recognized:** install a supported Node.js version, close VS Code completely, reopen it, and try again.
- **Vite reports port 5173 is occupied:** either stop the other Vite process with **Ctrl+C**, or accept Vite's printed alternate address.
- **Blank page after editing:** read the first error in the VS Code terminal or browser developer console. Check that each import path and filename exactly matches the new file.
- **Styles appear unchanged:** verify `main.jsx` imports `./styles/main-layout.css`, then reload the browser.
