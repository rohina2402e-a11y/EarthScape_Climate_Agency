# Frontend phase: application layout

This frontend step includes a responsive shell, authentication pages, and seven workspace pages: Admin Dashboard, Analyst Dashboard, Climate Data, Climate Visualizations, Predictions, Notifications, and Feedback & Support. Authentication, dataset catalog management, alerts, and support requests connect to the Express API. Dashboard charts, visualizations, and predictions still use illustrative data and are not connected to a trained model.

## Files created or updated

- `frontend/src/App.jsx` — browser routes.
- `frontend/src/auth/AuthContext.jsx` — restores the signed-in session and manages sign-out.
- `frontend/src/auth/ProtectedRoutes.jsx` — redirects anonymous users and restricts role-specific routes.
- `frontend/src/components/AppLayout.jsx` — shared page frame and responsive menu state.
- `frontend/src/components/Sidebar.jsx` — role-aware navigation groups and active link styles.
- `frontend/src/components/TopBar.jsx` — page breadcrumb, notification shortcut, current account, and sign-out.
- `frontend/src/components/LoginPage.jsx` — API-backed sign-in form.
- `frontend/src/components/RegistrationPage.jsx` — public Analyst-only registration form.
- `frontend/src/styles/auth.css` — sign-in and registration styling.
- `frontend/src/components/NavIcon.jsx` — small reusable inline icons.
- `frontend/src/pages/SectionPlaceholder.jsx` — welcome screen and temporary route placeholders.
- `frontend/src/pages/AdminDashboard.jsx` — Admin Dashboard page composition.
- `frontend/src/pages/AnalystDashboard.jsx` — Analyst Dashboard page composition, analysis insights, and anomaly reports.
- `frontend/src/pages/ClimateDataPage.jsx` — API-backed dataset catalog, search and filters, and Admin-only CSV import.
- `frontend/src/pages/ClimateVisualizationsPage.jsx` — regional comparison charts and interactive Leaflet station map.
- `frontend/src/pages/PredictionsPage.jsx` — illustrative temperature and rainfall forecast charts, horizon selector, and anomaly-review signals.
- `frontend/src/pages/NotificationsPage.jsx` — API-backed climate alerts, per-user read status, and Admin alert management.
- `frontend/src/pages/SupportPage.jsx` — API-backed feedback/support form and role-aware request status management.
- `frontend/src/components/dashboard/` — reusable metric cards, charts, regional highlights, and alerts.
- `frontend/src/data/adminDashboardData.js` — illustrative dashboard data.
- `frontend/src/data/analystDashboardData.js` — illustrative analyst metrics, observations, and anomaly reports.
- `frontend/src/data/climateDatasets.js` — source labels used by the catalog.
- `frontend/src/data/visualizationData.js` — illustrative regional trends and map station observations.
- `frontend/src/data/predictionData.js` — illustrative historical/forecast series and sample anomaly signals.
- `frontend/src/data/notificationsData.js` — legacy sample alert entries (live notifications now come from the API).
- `frontend/src/data/supportData.js` — feedback categories used by the support form.
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

4. Open the local URL Vite prints, usually `http://localhost:5173`. New users can select **Create an Analyst account**; Admins are provisioned separately.

If dependencies are already installed, you can skip `npm install`. To stop Vite, focus the terminal running it and press **Ctrl+C**.

## What to check

- On a wide screen, the navigation stays visible on the left.
- On a narrow screen, select the menu icon to open the sidebar and select the shaded area or a link to close it.
- Opening a workspace page without signing in redirects to `/login`.
- Public registration creates an Analyst account only; it cannot assign the Admin role.
- After login, the sidebar shows the dashboard matching the account role. Analysts cannot open `/admin`.
- The top bar shows the signed-in account. **Sign out** revokes the API token and returns to `/login`.
- The initial Admin account is provisioned with `npm run create-admin`; Admin-created users must change their temporary password when they sign in.
- The Admin dashboard opens `/admin`; the Analyst workspace opens `/analyst`.
- Both dashboards have interactive temperature charts with 7D, 30D, and 90D controls, as well as rainfall charts with hover tooltips.
- Climate data opens `/data`, where the catalog supports search and source/status filtering. Analysts can view metadata; Admins can import CSV observations and manage dataset metadata. CSV imports require configured HDFS, are limited to 5 MB and 5,000 rows, and create records in MongoDB plus the original file in HDFS.
- Visualizations opens `/visualizations`, with regional temperature and rainfall comparisons and a Leaflet map whose temperature/rainfall layers and station tooltips are interactive.
- The interactive map uses OpenStreetMap tiles and displays its required attribution; an internet connection is needed to load the map background.
- Predictions opens `/predictions` with illustrative temperature/rainfall outlooks and sample anomaly signals. Its 3/6/12-month selector updates the chart horizon; the forecast values are not generated by a trained model.
- Notifications opens `/notifications`, where API alerts can be filtered and marked read individually or all at once. Read status is saved per account. Admins can create and delete alerts.
- Feedback & support opens `/support`, with a feedback/issue form and persisted request-status list. Analysts see their requests; Admins can review and update all requests.
- Login, Analyst registration, session restoration, protected workspace routes, and server-side logout are connected to the Express API.
- Forgot-password/reset emails are not implemented yet.
- Dashboard numbers, findings, and chart data are examples for the frontend preview, not live agency measurements.
- Climate dataset metadata, notifications, and feedback records are loaded from MongoDB through the Express API. CSV source files are uploaded to HDFS; they are not stored in MongoDB.
- Dataset metadata registration using `POST /api/datasets/upload` records metadata only. For real CSV observations, the frontend uses `POST /api/ingestion/uploads`; the required Thunder Client requests and permissions are in `documentation/setup.md`.

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
