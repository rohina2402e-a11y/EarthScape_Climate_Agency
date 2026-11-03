# Local setup notes

This guide is for the existing EarthScape repository. It does not create a second project or reset existing application code.

## How the applications fit together

- `frontend/` contains the Vite React application. It runs in the browser and sends HTTP requests to the API.
- `backend/` contains the Node.js/Express API. Mongoose connects it to MongoDB.
- Authenticated climate CSV uploads are validated by the backend and imported as MongoDB observation records. The API keeps upload status and a checksum, but does not keep the original file.
- `bigdata/` is reserved for Hadoop, MapReduce, Hive, Kafka, and Spark configuration and jobs.
- `machine-learning/` is reserved for Python scripts, datasets, and model artifacts.
- MongoDB stores application records. Large raw datasets will use HDFS in a later phase.

## Local ports

| Service | Default address |
|---|---|
| React development server | `http://localhost:5173` |
| Express API | `http://localhost:5000` |
| MongoDB | `mongodb://127.0.0.1:27017/earthscape_climate` |

The Vite development proxy sends browser requests beginning with `/api` to the Express API. The browser does not connect directly to MongoDB.

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

## Big-data and ML prerequisites

Install Java and Python directly on the operating system, not in containers. Use compatible 64-bit versions selected for the Hadoop, Hive, Spark, Kafka, and TensorFlow versions chosen in later phases. The current machine's Java 8 (32-bit) and Python 3.14 should not be assumed compatible with the complete toolchain.
