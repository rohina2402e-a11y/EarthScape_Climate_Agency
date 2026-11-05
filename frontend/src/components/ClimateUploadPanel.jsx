import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

const csvExample = `sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit,quality
weather_station,station-042,2026-11-03T10:00:00Z,34.05,-118.24,temperature,28.4,°C,valid`;

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function ClimateUploadPanel({ onError, onImported }) {
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);

  const loadUploads = useCallback(async () => {
    try {
      const result = await apiRequest("/api/ingestion/uploads");
      setUploads(result.uploads);
    } catch (error) {
      onError(error);
    }
  }, [onError]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  async function submit(event) {
    event.preventDefault();
    if (!file) {
      onError(new Error("Choose a CSV file first."));
      return;
    }

    const formElement = event.currentTarget;
    setUploading(true);
    onError(null);
    const body = new FormData();
    body.append("file", file);

    try {
      await apiRequest("/api/ingestion/uploads", { method: "POST", body });
      setFile(null);
      formElement.reset();
      await Promise.all([loadUploads(), onImported()]);
    } catch (error) {
      onError(error);
      await loadUploads();
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card panel-card">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="h5 mb-1">Import climate observations</h2>
            <p className="text-secondary small mb-0">
              Upload a CSV file. Files are limited to 5 MB and 5,000 observation rows.
            </p>
          </div>
          <span className="source-label">CSV · local storage + MongoDB</span>
        </div>
        <form className="row g-3 align-items-end mb-3" onSubmit={submit}>
          <div className="col-md-9">
            <label className="form-label" htmlFor="climateCsv">Climate CSV file</label>
            <input
              className="form-control"
              id="climateCsv"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={uploading}
              required
            />
          </div>
          <div className="col-md-3 d-grid">
            <button className="btn btn-forest" type="submit" disabled={uploading || !file}>
              {uploading ? "Importing..." : "Upload and import"}
            </button>
          </div>
        </form>

        <details className="csv-help mb-4">
          <summary className="small fw-semibold">View the required CSV format</summary>
          <p className="text-secondary small mt-2 mb-2">
            Include these exact headers. Each row represents one measurement; the quality column is optional.
            Timestamps must include a timezone.
          </p>
          <pre className="csv-example mb-0"><code>{csvExample}</code></pre>
        </details>

        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="h6 mb-0">Upload history</h3>
          <span className="text-secondary small">{uploads.length} recent uploads</span>
        </div>
        {uploads.length === 0 ? (
          <p className="text-secondary small mb-0">No climate CSV files have been uploaded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Status</th>
                  <th scope="col">Rows</th>
                  <th scope="col">Local file path</th>
                  <th scope="col">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload._id}>
                    <td>
                      <span className="d-block fw-semibold">{upload.originalFilename}</span>
                      {upload.uploadedBy?.email && (
                        <span className="text-secondary small">{upload.uploadedBy.email}</span>
                      )}
                      {upload.errorMessage && (
                        <span className="d-block small text-danger">{upload.errorMessage}</span>
                      )}
                    </td>
                    <td><span className={`upload-status status-${upload.status}`}>{upload.status}</span></td>
                    <td>{upload.recordCount}</td>
                    <td><code className="storage-path">{upload.storagePath ?? "—"}</code></td>
                    <td className="text-secondary small">{formatDate(upload.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
