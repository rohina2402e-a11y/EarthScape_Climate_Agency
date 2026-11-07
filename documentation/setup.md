# Local setup notes

This guide is for the existing EarthScape repository. It does not create a second project or reset existing application code.

## How the applications fit together

- `frontend/` contains the Vite React application. It runs in the browser and sends HTTP requests to the API.
- `backend/` contains the Node.js/Express API. Mongoose connects it to MongoDB.
- Authenticated climate CSV uploads are validated by the backend and imported as MongoDB observation records. The original file is kept in local climate storage, and MongoDB stores its metadata and processing status.
- `machine-learning/` contains the reusable Python climate processors, command-line scripts, tests, and model artifacts.
- MongoDB stores application records and dataset metadata. Admin dataset uploads are stored under `backend/uploads/` by category; the separate observation-import CSV files remain under `data/climate-data/`.

## Local ports

| Service | Default address |
|---|---|
| React development server | `http://localhost:5173` |
| Express API | `http://localhost:5000` |
| MongoDB | `mongodb://127.0.0.1:27017/earthscape_climate` |

The Vite development proxy sends browser requests beginning with `/api` to the Express API. The browser does not connect directly to MongoDB.

## Set up Python climate processing

Install 64-bit Python 3.13 from the [official Python for Windows downloads page](https://www.python.org/downloads/windows/) if it is not already installed. Open the existing repository folder in VS Code, choose **Terminal → New Terminal**, and use the integrated PowerShell terminal from the repository root:

```powershell
py -3.13 --version
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r machine-learning\requirements.txt
.\.venv\Scripts\python.exe -m pip check
```

The `.venv` virtual environment belongs at the repository root and is ignored by Git. This shorter Windows path avoids path-length problems while installing TensorFlow. Verify the installed climate libraries:

```powershell
.\.venv\Scripts\python.exe -c "import numpy, pandas, dask, pymongo, sklearn, tensorflow, xarray, netCDF4, h5py, rasterio; print('Climate libraries are ready')"
```

The packages cover tabular processing, larger-than-memory Dask workloads, MongoDB access, machine learning, NetCDF, HDF5, and GeoTIFF. Python's standard library will handle XML.

The reusable climate reader is in `machine-learning/climate_processing/tabular.py`. It supports CSV, JSON, and XML records; NetCDF grids with time/latitude/longitude coordinates; HDF5 files with same-length named datasets; and GeoTIFF climate bands. Common field names are normalized, invalid or missing values become Pandas missing values, and incomplete records are kept for review. GeoTIFF files need a coordinate reference system and variable names in band descriptions/tags (a single-band file can use its filename). The analysis reports missing counts and percentages, temperature/rainfall/humidity/wind-speed/pressure statistics, and monthly and yearly trends. Values in a dataset must use consistent units; automatic unit conversion is not performed.

### Process uploaded CSV and JSON datasets

The admin dataset upload endpoint stores the original file locally and leaves its content unchanged. CSV and JSON uploads are then sent from Express to the internal FastAPI service in `machine-learning/api/index.py`. Python normalizes date and numeric fields, removes duplicate rows and invalid dates, marks out-of-range measurements as missing, calculates measurement statistics and monthly/yearly trends, and uses scikit-learn Isolation Forest to flag unusual records. Express saves the summary, cleaning counts, and up to 100 example anomalies in the MongoDB dataset document. The processing status advances through `queued` and `processing` to `completed`, or becomes `failed` with an error message. Other accepted file formats remain queued because this processing pipeline handles CSV and JSON.

Run the processor directly against the included sample file without changing it:

```powershell
.\.venv\Scripts\python.exe machine-learning\scripts\process_dataset.py machine-learning\datasets\sample-climate.csv
```

The script prints one JSON result containing `record_count`, `cleaning`, `summary.statistics`, `summary.monthly_trends`, `summary.yearly_trends`, and `anomalies`.

### Deploy the existing app as Vercel services

The root `vercel.json` declares three services. `backend` (Express) receives public `/api/...` requests and has a private service binding to `machine-learning` (FastAPI) using `CLIMATE_PROCESSOR_URL`. `frontend` (Vite) receives all remaining paths. The Python service has no public rewrite; the React app calls the public Express routes through relative `/api/...` URLs. Vercel injects the binding at runtime; do not add `CLIMATE_PROCESSOR_URL` to Vercel environment variables.

Set `MONGO_URI` and `JWT_SECRET` in Vercel's project environment settings for each deployment environment. `JWT_SECRET` must be at least 32 bytes. `FRONTEND_ORIGIN` can be set to the public frontend origin; same-origin requests do not require CORS. Test the services locally from the repository root with:

```powershell
npx vercel dev
```

Then open `http://localhost:3000` and check `http://localhost:3000/api/health`. For regular local development without Vercel CLI, install the Python API dependencies and start the internal service in a second terminal:

```powershell
.\.venv\Scripts\python.exe -m pip install -r machine-learning\api\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn api.index:app --app-dir machine-learning --host 127.0.0.1 --port 8000
```

When deployed to Vercel, HTTP uploads are limited to 4 MB to stay below the Functions request-body limit; local Express keeps its existing larger limits. Important: the current backend file store uses local disk. On Vercel, uploads are temporarily placed under `/tmp`, which is not durable or shared between function instances. Configure durable object storage (for example Vercel Blob or S3) before relying on uploaded originals in production; MongoDB persists dataset metadata and processing summaries, not the uploaded file contents.

To upload a dataset while the backend and MongoDB are running, replace `<ADMIN_TOKEN>` with a valid admin access token and run this from the repository root:

```powershell
curl.exe -X POST http://localhost:5000/api/datasets/upload `
  -H "Authorization: Bearer <ADMIN_TOKEN>" `
  -F "file=@machine-learning\datasets\sample-climate.csv" `
  -F "name=Sample climate dataset" `
  -F "datasetType=weather_station"
```

The response contains the dataset `processingStatus`, `recordCount`, `processingResults`, and (if processing fails) `processingError`. Check the status later with `GET /api/datasets/<dataset-id>` using the same bearer token. CSV or JSON needs an observation date column such as `observedAt` or `date`; recognized measurement columns include temperature, rainfall/precipitation, and humidity. Missing measurement values are kept as missing rather than deleting the whole observation. CSV/JSON processing requires no additional backend npm package.

Run the standalone readers or clean/analyze a dataset from the repository root. First try the included sample file:

```powershell
.\.venv\Scripts\python.exe machine-learning\scripts\read_csv.py machine-learning\datasets\sample-climate.csv
.\.venv\Scripts\python.exe machine-learning\scripts\clean_data.py machine-learning\datasets\sample-climate.csv "$env:TEMP\earthscape-cleaned-climate.csv"
.\.venv\Scripts\python.exe machine-learning\scripts\analyze_climate.py machine-learning\datasets\sample-climate.csv
```

Expected: the analysis reports `record_count` 3, with monthly periods `2026-01` and `2026-02`, and a yearly period `2026`. Each reader prints a JSON analysis summary to the terminal. The cleaning script writes a normalized CSV to your Windows temporary folder and does not overwrite the original input. To process an uploaded dataset, replace `machine-learning\datasets\sample-climate.csv` with its path, such as `backend\uploads\weather\your-dataset.csv`. Use `read_csv.py --large <file.csv>` or `analyze_climate.py --large <file.csv>` to process a large CSV with Dask; add `--blocksize 64MB` to choose an approximate partition size.

Run its tests from the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s machine-learning\tests -v
```

The NetCDF reader expands coordinate grids into location/time records. The GeoTIFF reader makes one record per valid pixel and converts its coordinates to latitude/longitude. These format readers currently use Pandas and can require substantial memory for large grids.

### Process larger climate CSV files with Dask

The Dask loader reads CSV files in partitions and keeps processing lazy until a summary is requested. It accepts both wide CSV files (one row per observation) and the existing long measurement format (one row per measurement). It does not yet scale NetCDF, HDF5, or GeoTIFF reading.

From the repository root, start Python with the `machine-learning/` directory on its import path:

```powershell
$env:PYTHONPATH = "$PWD\machine-learning"
.\.venv\Scripts\python.exe
```

In the Python prompt, load and summarize a large CSV. Replace the example path with the actual dataset path:

```python
from climate_processing import load_large_climate_csv, summarize_large_climate_data

climate = load_large_climate_csv(
    r"data\climate-data\uploads\large-observations.csv",
    blocksize="64MB"
)
print(f"Partitions: {climate.npartitions}")
summary = summarize_large_climate_data(climate)
print(summary)
```

`blocksize` controls the approximate size of each input partition; Dask does not load the complete CSV into a single Pandas DataFrame. The summary computes record completeness, missing-value counts, and statistics for temperature, rainfall, humidity, wind speed, and atmospheric pressure. Original files remain in local storage and are not changed by processing.

## Climate CSV format

From the signed-in dashboard, choose a `.csv` file in the import panel. The maximum file size is 5 MB and the maximum number of data rows is 5,000. Required, case-sensitive headers are:

```text
sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit
```

An optional `quality` column accepts `valid` or `needs_review`. Timestamps must include a timezone; for example, `2026-11-03T10:00:00Z`. An invalid row rejects the import before observations are saved. Analysts can review their own upload history; Admins can review all upload history.

## Start and verify

The backend uses a `src/` layout with separate configuration, middleware, services, and feature modules. Keep this existing layout rather than creating duplicate files at the backend root.

1. Start the MongoDB Windows service. In PowerShell, check it with:

   ```powershell
   Get-Service MongoDB
   ```

   The service status should be `Running`.
2. In a VS Code terminal, go to the backend folder:

   ```powershell
   Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\backend
   ```

3. If `backend\.env` does not exist yet, copy the example file. Keep any existing private secrets in `.env`; do not overwrite it with the example:

   ```powershell
   Copy-Item .env.example .env
   ```

   Ensure `MONGO_URI` is set to `mongodb://127.0.0.1:27017/earthscape_climate`. Keep the JWT secret private.
4. Install dependencies if needed, then start the backend:

   ```powershell
   npm install
   npm run dev
   ```

   Expected output includes `Connected to MongoDB database "earthscape_climate".` and `EarthScape API listening on http://localhost:5000`.
5. In a second VS Code terminal, check the API:

   ```powershell
   Invoke-RestMethod http://localhost:5000/api/health
   ```

   A healthy response reports `status: ok` and `database: connected`.
6. On startup, the backend creates the `users`, `datasets`, `alerts`, and `feedback` collections if they do not already exist. They start empty and receive documents as the related API features are implemented and used. This setup does not delete data from the former `earthscape` database.

7. To run the existing frontend, open a separate terminal and run `Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\frontend`, then `npm run dev`.

Do not put real passwords, JWT secrets, or production connection strings in source control. `.env` is excluded by `.gitignore`.

## Authentication and role access

The public registration page creates **Analyst** accounts only. Even if a request includes `"role": "admin"`, the API ignores it. Create the first Admin account from the backend terminal instead:

1. Stop before this step if an Admin account already exists. The bootstrap script refuses to create a second one.
2. Open `backend\.env` in VS Code and add `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. Use a unique email and a password of at least 12 characters. Do not put these values in a command, screenshot, or source file.
3. In a backend terminal, run:

   ```powershell
   Set-Location C:\Users\Admin\Documents\GitHub\EarthScape_Climate_Agency\backend
   npm run create-admin
   ```

4. Remove the two bootstrap values from `.env` after the script reports success. The initial Admin must change the temporary password after signing in.

To try Analyst sign-up, open `http://localhost:5173/register`, create an account with an email and a password at least 12 characters long, then sign in at `/login`. The JWT is kept in the current browser session. **Sign out** calls the API to revoke the token and then clears it from the browser. The dashboards and data pages require a signed-in account; the Admin dashboard is restricted to Admins.

### Test authentication with Thunder Client

Open the Thunder Client extension in VS Code and create these requests while the API is running:

1. **Register an Analyst**
   - Method: `POST`
   - URL: `http://localhost:5000/api/auth/register`
   - Header: `Content-Type: application/json`
   - Body → JSON:

     ```json
     {
       "email": "analyst@example.org",
       "password": "replace-with-a-private-password"
     }
     ```

   - Expected: `201 Created` with a user whose role is `analyst`. Use your own email and a private password; the example password is only a placeholder.
2. **Sign in**
   - Method: `POST`
   - URL: `http://localhost:5000/api/auth/login`
   - Use the same JSON email and password.
   - Expected: `200 OK`, a user object, and a JWT in the `token` field.
3. **Check the signed-in user**
   - Method: `GET`
   - URL: `http://localhost:5000/api/auth/me`
   - In the **Auth** tab select **Bearer**, then paste the token from the login response.
   - Expected: `200 OK` and the current Analyst user.
4. **Sign out and confirm token revocation**
   - Method: `POST`
   - URL: `http://localhost:5000/api/auth/logout`
   - Keep the same Bearer token.
   - Expected: `200 OK`. Send the `/api/auth/me` request again with that same token; it should now return `401 Unauthorized`.

The Admin bootstrap account is the only supported way to get the Admin role. Admins can create Analyst accounts through the protected user-management API. Password-reset emails are not implemented yet.

## Dataset, alert, and feedback APIs

These routes require a valid Bearer token. Admin actions also require the Admin to have changed their initial password.

| Action | Admin | Analyst |
|---|---|---|
| List and view dataset metadata | Yes | Yes |
| Upload dataset files and save metadata | Yes | No |
| Delete a dataset and its uploaded file | Yes | No |
| Read climate alerts | Yes | Yes |
| Create, edit, or delete climate alerts | Yes | No |
| Mark alerts read/unread | Own read status | Own read status |
| Submit feedback and view own requests | Yes | Yes |
| View all feedback and update/delete requests | Yes | No |

### Upload a climate dataset with Thunder Client

1. Sign in as an Admin and copy the JWT from the login response. Create `POST http://localhost:5000/api/datasets/upload`.
2. Set the `Authorization` header to `Bearer <Admin JWT>`.
3. Choose **Body → Multipart Form** and add `name` (Text), `datasetType` (Text; for example `weather_station`), and `file` (File).
4. Supported dataset types are `satellite`, `weather_station`, `environmental_sensor`, and `historical`. Supported extensions are `.csv`, `.json`, `.xml`, `.nc`, `.nc4`, `.netcdf`, `.h5`, `.hdf5`, `.tif`, and `.tiff`. The upload limit is 100 MB. A successful response is `201 Created` with `processingStatus: "queued"`.
5. Uploaded files are stored under `backend/uploads/satellite/`, `backend/uploads/weather/`, `backend/uploads/sensors/`, or `backend/uploads/historical/`, based on dataset type. Set `DATASET_STORAGE_DIR` in `backend\.env` to override the default root, `backend/uploads/`.
6. Either role can call `GET http://localhost:5000/api/datasets` and `GET http://localhost:5000/api/datasets/<id>`. Only Admins can upload or delete; deleting a dataset removes its catalog record and its stored file.

### Obsolete JSON-only metadata example (do not use for file uploads)

1. As an Admin, send `POST http://localhost:5000/api/datasets/upload`, with the Admin JWT as a Bearer token and this JSON body:

   ```json
   {
     "name": "Regional temperature metadata",
     "datasetType": "weather_station",
     "fileFormat": "CSV"
   }
   ```

   This old JSON-only example is superseded. The current endpoint requires the multipart file upload described above.
2. As either role, send `GET http://localhost:5000/api/datasets` to list dataset metadata, then `GET http://localhost:5000/api/datasets/<id>` to view one record.
3. As an Analyst, try `POST /api/datasets/upload` or `DELETE /api/datasets/<id>`; each should return `403 Forbidden`.
4. The current Admin delete endpoint removes a newly uploaded dataset file and its catalog record. The separate observation-import workflow keeps its observation records and original files in local climate storage.

For an actual CSV observation import, use `POST http://localhost:5000/api/ingestion/uploads` with **Body → Multipart Form**, field name `file`, and a `.csv` file. This is Admin-only, accepts one CSV up to 5 MB, validates up to 5,000 rows, stores the original file under `data/climate-data/uploads/`, and writes observations and dataset metadata to MongoDB. A successful import also creates a dataset catalog record. If local climate storage is not configured, the endpoint returns `503`.

### Test alerts with Thunder Client

1. As an Admin, create an alert using `POST http://localhost:5000/api/alerts`, Bearer authentication, and JSON:

   ```json
   {
     "title": "Elevated temperature reading",
     "description": "A station exceeded the expected range.",
     "location": "Pacific Northwest",
     "category": "Temperature",
     "severity": "high"
   }
   ```

   Valid severity values are `low`, `medium`, `high`, and `critical`.
2. Admins and Analysts can use `GET http://localhost:5000/api/alerts`.
3. An authenticated user marks an alert as read for **their account only** with `PUT http://localhost:5000/api/alerts/<id>` and JSON `{ "read": true }`. Use `{ "read": false }` to mark it unread.
4. Only an Admin can edit alert details using `PUT /api/alerts/<id>` or delete an alert using `DELETE /api/alerts/<id>`.

### Test feedback and support with Thunder Client

1. An authenticated user submits a request with `POST http://localhost:5000/api/feedback` and JSON:

   ```json
   {
     "category": "Technical issue",
     "subject": "Chart export is unavailable",
     "message": "The export button did not create a file."
   }
   ```

   Expected: `201 Created` with status `received`.
2. `GET /api/feedback` returns the signed-in Analyst's own requests, or all requests for an Admin.
3. Only an Admin can update a request with `PUT /api/feedback/<id>`, for example `{ "status": "in_progress", "adminNote": "Assigned for review" }`. Valid statuses are `received`, `in_progress`, and `resolved`.
4. Only an Admin can delete a feedback request with `DELETE /api/feedback/<id>`.

The Climate Data, Notifications, and Feedback & Support pages use these APIs. Climate measurements, forecasts, visualizations, and other dashboard examples remain illustrative; this work does not connect prediction pages to a trained model.

## Climate dataset storage

The backend stores uploaded original files in the local `data/climate-data/` directory by default. Change `CLIMATE_STORAGE_DIR` in `backend\.env` to select another local directory. Dataset metadata and processed observation records stay in MongoDB; deleting a metadata record does not delete the original file or observation records.
