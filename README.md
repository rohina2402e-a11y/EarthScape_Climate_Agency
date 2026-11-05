# EarthScape Climate Agency

EarthScape is being developed in small phases. The project includes a React/Vite frontend, an Express API, MongoDB-backed observations and dataset metadata, Admin/Analyst authentication, and a Python environment for climate data processing. Original climate files are stored locally during development.

> **Use the existing project folder.** The current repository is `EarthScape_Climate_Agency`. Do not create another copy or run the Vite scaffolding command over this project.

## Project layout

```text
EarthScape_Climate_Agency/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable React interface pieces
│   │   ├── services/         # Calls from React to the API
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── assets/               # Frontend images and other static assets
│   ├── pages/                # Page-level UI (add as features grow)
│   ├── styles/                # Additional styles (current CSS is src/styles.css)
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/            # MongoDB connection
│   │   ├── middleware/        # Authentication and role checks
│   │   ├── modules/           # Auth, users, observations, and CSV ingestion
│   │   ├── services/          # Shared backend services
│   │   └── server.js
│   ├── scripts/               # One-time setup commands
│   └── test/
├── bigdata/
│   ├── hive/
│   ├── kafka/
│   └── spark/
├── machine-learning/
│   ├── datasets/
│   ├── models/
│   └── scripts/
├── documentation/
└── .vscode/
```

The current frontend and backend use the conventional `src` layout created for the existing application. Python climate-processing dependencies live in `machine-learning/requirements.txt`; the local Python virtual environment is kept at the repository root and ignored by Git.

## Requirements

- VS Code with its integrated PowerShell terminal.
- Node.js 20.19+ or 22.12+ and npm.
- MongoDB Community Server running locally, or a MongoDB URI.
- A **64-bit Python 3.13** installation for climate data processing and analysis.

The climate processing stack uses Pandas, NumPy, Dask, PyMongo, scikit-learn, TensorFlow, xarray, netCDF4, h5py, and Rasterio. XML parsing uses Python's standard library.

## Open in VS Code

From VS Code, choose **File → Open Folder...** and open the existing `EarthScape_Climate_Agency` repository. Open a terminal using **Terminal → New Terminal**. The steps below use PowerShell.

## Install npm dependencies

Run each command from its specified project folder:

**Backend terminal:**

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\backend
npm install
```

**Frontend terminal:**

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\frontend
npm install
```

The lock files make these commands install the project’s existing dependencies. The frontend already uses React and Vite; the backend already uses Express, Mongoose, JWT, and bcrypt.

## Configure MongoDB and the backend

MongoDB must be running before the API starts. The default local connection is:

```text
mongodb://127.0.0.1:27017/earthscape_climate
```

Create a local environment file. From the repository root in the VS Code PowerShell terminal:

```powershell
Copy-Item backend\.env.example backend\.env
$jwtSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
$envText = Get-Content backend\.env -Raw
$envText = $envText.Replace('replace-with-a-random-secret-at-least-32-bytes-long', $jwtSecret)
Set-Content backend\.env -Value $envText -Encoding ascii
```

This creates a private local JWT signing secret without printing it. `.env` is ignored by Git. Do not copy real secrets into this README or commit them.

Start the API in a backend terminal:

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\backend
npm run dev
```

Expected output includes:

```text
Connected to MongoDB.
EarthScape API listening on http://localhost:5000
```

Check the health endpoint from another terminal:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected result:

```text
status database
------ --------
ok     connected
```

## Start the React frontend

Open a second VS Code terminal:

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\frontend
npm run dev
```

Vite prints a local URL, usually `http://localhost:5173`. Open it in your browser. The frontend forwards `/api` requests to the backend on port `5000`.

The frontend is already initialized with Vite. For reference, the initial Vite command for a **new, empty** project would be:

```powershell
npm create vite@latest frontend -- --template react
```

Do not run that command in this existing repository; it would create or overwrite another frontend scaffold.

## Python climate environment

Install Python 3.13 from the [official Python downloads page](https://www.python.org/downloads/windows/) if it is not already installed. In a VS Code PowerShell terminal opened at the repository root, create the virtual environment and install the climate libraries:

```powershell
py -3.13 --version
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r machine-learning\requirements.txt
.\.venv\Scripts\python.exe -m pip check
```

The virtual environment is at the repository root to keep installed package paths short on Windows. The `.venv` folder is ignored by Git. Verify the imports:

```powershell
.\.venv\Scripts\python.exe -c "import numpy, pandas, dask, pymongo, sklearn, tensorflow, xarray, netCDF4, h5py, rasterio; print('Climate libraries are ready')"
```

Dataset uploads are stored under `backend/uploads/` by category by default. The separate CSV-observation import keeps its original files under `data/climate-data/`. MongoDB stores dataset metadata and application records, not the original large files.

## Common setup errors

- **`npm` or `node` is not recognized:** install a supported Node.js LTS version, then close and reopen VS Code.
- **MongoDB connection refused:** check that the MongoDB Windows service is running and that `MONGO_URI` in `backend\.env` points to the correct server.
- **`JWT_SECRET` is missing or too short:** repeat the `.env` setup above; keep the secret private.
- **Port 5000 or 5173 is already in use:** close the other app using that port or change `PORT` / the Vite port configuration.
- **PowerShell says scripts are disabled:** the documented commands do not require changing PowerShell's execution policy; use `npm run dev` directly in each project folder.
- **`py -3.13` is not recognized:** install Python 3.13 from the official Python downloads page, then restart VS Code.

## Existing API routes

- `GET /api/health` — API and database readiness.
- `POST /api/auth/register` — public Analyst-only registration; a submitted role is ignored.
- `POST /api/auth/login` — sign in and receive a JWT.
- `GET /api/auth/me` — current signed-in account.
- `POST /api/auth/logout` — revoke the signed-in account's existing JWTs.
- `POST /api/auth/change-password` — change password and invalidate existing tokens.
- `GET /api/users` and `POST /api/users` — Admin-only account management.
- `POST /api/datasets/upload`, `GET /api/datasets`, and `GET/DELETE /api/datasets/:id` — Admin-managed climate dataset files and metadata; Analysts can list and view datasets.
- `GET/POST /api/alerts` and `PUT/DELETE /api/alerts/:id` — Admin-managed climate alerts with per-user read status.
- `GET/POST /api/feedback` and `PUT/DELETE /api/feedback/:id` — user-submitted support requests and Admin management.
- `GET /api/observations` and `POST /api/observations` — authenticated climate observations.
- `GET /api/ingestion/uploads` — recent upload history (Analysts see their own; Admins see all).
- `POST /api/ingestion/uploads` — Admin-only CSV import; the original file is stored locally and validated observations plus dataset metadata are stored in MongoDB.

## Import a climate CSV

Sign in as an Admin or Analyst and use the **Import climate observations** panel. Upload one `.csv` at a time; the API limits uploads to **5 MB** and **5,000 observation rows**. The whole file is validated before its observations are saved. A successful import appears in upload history and the imported observations appear in the dashboard. Failed imports show a validation error and a failed status. Re-uploading the same completed file as the same user is rejected to help prevent accidental duplicate imports.

CSV header names are case-sensitive. These eight columns are required; `quality` is optional. Each row describes one measurement. Timestamps must be ISO 8601 and include a timezone.

```csv
sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit,quality
weather_station,station-042,2026-11-03T10:00:00Z,34.05,-118.24,temperature,28.4,°C,valid
```

Allowed `sourceType` values are `satellite`, `weather_station`, and `environmental_sensor`. Allowed `quality` values are `valid` and `needs_review`. Latitude must be from -90 to 90; longitude must be from -180 to 180.

The observation import API stores each original CSV below `data/climate-data/uploads/`, validates its rows, and stores observation records plus upload metadata in MongoDB. The dataset upload API stores supported original files under `backend/uploads/satellite/`, `weather/`, `sensors/`, or `historical/`, and saves dataset metadata in MongoDB. Configure those roots with `CLIMATE_STORAGE_DIR` and `DATASET_STORAGE_DIR` in `backend\.env`. Python processing is a later Phase 5 step.

More detailed setup notes are in [documentation/setup.md](./documentation/setup.md).
The frontend authentication, protected routes, and step-by-step run instructions are in [documentation/frontend-layout.md](./documentation/frontend-layout.md).
Role permissions and Thunder Client examples for authentication, datasets, alerts, and feedback are in [documentation/setup.md](./documentation/setup.md).
