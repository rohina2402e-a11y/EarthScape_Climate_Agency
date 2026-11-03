# EarthScape Climate Agency

EarthScape is being developed in small phases. The project includes a React/Vite frontend, an Express API, MongoDB-backed observations, Admin/Analyst authentication, and authenticated CSV climate-data ingestion. The big-data and machine-learning folders are separate placeholders for later phases.

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
│   ├── hadoop/
│   ├── mapreduce/
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

The current frontend and backend use the conventional `src` layout created for the existing application. Hadoop and ML files live outside those folders so the technologies do not get mixed together.

## Requirements

- VS Code with its integrated PowerShell terminal.
- Node.js 20.19+ or 22.12+ and npm.
- MongoDB Community Server running locally, or a MongoDB URI.
- For Hadoop 3.5: a **64-bit JDK 17**. JDK 17 is installed at `C:\Program Files\Java\jdk-17`, but the current Windows `PATH` still selects Java 8.
- For later machine learning: a **64-bit Python 3.11** installation is a practical starting point. The installed Python 3.14 may be too new for some Spark and TensorFlow dependencies.

Hadoop is being configured directly in Ubuntu under WSL 2; no Docker or Kubernetes is used. Hive, Kafka, and Spark are separate later phases.

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

## Java and Python setup

Check versions in the VS Code terminal:

```powershell
java -version
python --version
```

This computer has a supported **64-bit JDK 17** at `C:\Program Files\Java\jdk-17`, but `java` on the Windows `PATH` currently runs older 32-bit Java 8. Hadoop will use a separate Java 17 installation inside Ubuntu on WSL, so the Windows Java `PATH` does not need to be changed. For the ML environment, install **64-bit Python 3.11** from python.org and later create an isolated virtual environment inside `machine-learning`:

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\machine-learning
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version
```

Do not install TensorFlow or Spark until their versions are selected together in later phases.

## Set up Hadoop HDFS in WSL

The Windows machine is not running as an administrator, so WSL and Ubuntu could not be enabled during this phase. Follow [documentation/hadoop-wsl.md](./documentation/hadoop-wsl.md) to have a Windows administrator install WSL 2 and Ubuntu, configure Hadoop HDFS in Ubuntu, then connect the backend through WebHDFS. CSV imports remain paused until HDFS is configured.

## Common setup errors

- **`npm` or `node` is not recognized:** install a supported Node.js LTS version, then close and reopen VS Code.
- **MongoDB connection refused:** check that the MongoDB Windows service is running and that `MONGO_URI` in `backend\.env` points to the correct server.
- **`JWT_SECRET` is missing or too short:** repeat the `.env` setup above; keep the secret private.
- **Port 5000 or 5173 is already in use:** close the other app using that port or change `PORT` / the Vite port configuration.
- **PowerShell says scripts are disabled:** the documented commands do not require changing PowerShell's execution policy; use `npm run dev` directly in each project folder.
- **Java is still version 8 after installing a newer JDK:** restart VS Code and check `where.exe java`; update the Windows `PATH` so the JDK 17 `bin` folder comes first.

## Existing API routes

- `GET /api/health` — API and database readiness.
- `POST /api/auth/login` — sign in and receive a JWT.
- `GET /api/auth/me` — current signed-in account.
- `POST /api/auth/change-password` — change password and invalidate existing tokens.
- `GET /api/users` and `POST /api/users` — Admin-only account management.
- `GET /api/observations` and `POST /api/observations` — authenticated climate observations.
- `GET /api/ingestion/uploads` — recent upload history (Analysts see their own; Admins see all).
- `POST /api/ingestion/uploads` — authenticated CSV import.

## Import a climate CSV

Sign in as an Admin or Analyst and use the **Import climate observations** panel. Upload one `.csv` at a time; the API limits uploads to **5 MB** and **5,000 observation rows**. The whole file is validated before its observations are saved. A successful import appears in upload history and the imported observations appear in the dashboard. Failed imports show a validation error and a failed status. Re-uploading the same completed file as the same user is rejected to help prevent accidental duplicate imports.

CSV header names are case-sensitive. These eight columns are required; `quality` is optional. Each row describes one measurement. Timestamps must be ISO 8601 and include a timezone.

```csv
sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit,quality
weather_station,station-042,2026-11-03T10:00:00Z,34.05,-118.24,temperature,28.4,°C,valid
```

Allowed `sourceType` values are `satellite`, `weather_station`, and `environmental_sensor`. Allowed `quality` values are `valid` and `needs_review`. Latitude must be from -90 to 90; longitude must be from -180 to 180.

For this phase, the API parses the upload in memory and stores its observation records plus upload metadata in MongoDB. It does **not** retain the original file or write it to HDFS. HDFS storage and streaming ingestion are later phases.

More detailed setup notes are in [documentation/setup.md](./documentation/setup.md).
The frontend shell and its step-by-step run instructions are in [documentation/frontend-layout.md](./documentation/frontend-layout.md).
