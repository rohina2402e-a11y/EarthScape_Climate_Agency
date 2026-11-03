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
| Register dataset metadata with `POST /api/datasets/upload` | Yes | No |
| Delete dataset metadata | Yes | No |
| Read climate alerts | Yes | Yes |
| Create, edit, or delete climate alerts | Yes | No |
| Mark alerts read/unread | Own read status | Own read status |
| Submit feedback and view own requests | Yes | Yes |
| View all feedback and update/delete requests | Yes | No |

### Test dataset metadata with Thunder Client

1. As an Admin, send `POST http://localhost:5000/api/datasets/upload`, with the Admin JWT as a Bearer token and this JSON body:

   ```json
   {
     "name": "Regional temperature metadata",
     "datasetType": "weather_station",
     "fileFormat": "CSV"
   }
   ```

   Expected: `201 Created` with a dataset in `queued` status. This endpoint registers metadata only; it does not transmit file contents.
2. As either role, send `GET http://localhost:5000/api/datasets` to list dataset metadata, then `GET http://localhost:5000/api/datasets/<id>` to view one record.
3. As an Analyst, try `POST /api/datasets/upload` or `DELETE /api/datasets/<id>`; each should return `403 Forbidden`.
4. As an Admin, send `DELETE /api/datasets/<id>` to remove the metadata record. Removing metadata does not delete climate observations or files already stored in HDFS.

For an actual CSV observation import, use `POST http://localhost:5000/api/ingestion/uploads` with **Body → Multipart Form**, field name `file`, and a `.csv` file. This is Admin-only, accepts one CSV up to 5 MB, validates up to 5,000 rows, requires HDFS to be configured, writes the observations to MongoDB, and stores the original file in HDFS. A successful import also creates a dataset catalog record. If HDFS is not configured, this real-file endpoint returns `503`; use the CSV format described above.

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

## Big-data and ML prerequisites

Install Java and Python directly on the operating system, not in containers. Use compatible 64-bit versions selected for the Hadoop, Hive, Spark, Kafka, and TensorFlow versions chosen in later phases. The current machine's Java 8 (32-bit) and Python 3.14 should not be assumed compatible with the complete toolchain.
