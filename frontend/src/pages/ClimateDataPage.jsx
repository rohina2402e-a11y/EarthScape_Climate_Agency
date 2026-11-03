import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import NavIcon from "../components/NavIcon.jsx";
import { apiRequest } from "../services/api.js";

const sourceLabels = {
  satellite: "Satellite",
  weather_station: "Weather station",
  environmental_sensor: "Environmental sensor",
  mixed: "Mixed sources",
  other: "Other"
};
const formatLabels = { NETCDF: "NetCDF", GEOTIFF: "GeoTIFF" };
const statusLabels = {
  queued: "Queued",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed",
  needs_review: "Under review"
};
const maximumFileSize = 5 * 1024 * 1024;

function viewDataset(dataset) {
  return {
    ...dataset,
    source: sourceLabels[dataset.datasetType] ?? dataset.datasetType,
    type: formatLabels[dataset.fileFormat] ?? dataset.fileFormat,
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(dataset.uploadDate)),
    status: statusLabels[dataset.processingStatus] ?? dataset.processingStatus,
    records: dataset.recordCount ? dataset.recordCount.toLocaleString() : "—"
  };
}

function UploadPanel({ onFilesSelected, uploading }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function acceptFiles(fileList) {
    onFilesSelected(Array.from(fileList));
    if (inputRef?.current) inputRef.current.value = "";
  }

  return (
    <section aria-labelledby="upload-heading" className="dataset-upload-panel">
      <div className="dataset-upload-heading">
        <div className="dataset-upload-icon"><NavIcon name="upload" size={19} /></div>
        <div>
          <h2 id="upload-heading">Import climate observations</h2>
          <p>Upload a CSV file. Its observations are validated and saved through the API.</p>
        </div>
      </div>
      <div
        className={`dataset-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          acceptFiles(event.dataTransfer.files);
        }}
      >
        <input
          accept=".csv,text/csv"
          className="visually-hidden"
          disabled={uploading}
          onChange={(event) => acceptFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <span aria-hidden="true" className="dataset-dropzone-icon"><NavIcon name="upload" size={20} /></span>
        <strong>
          {uploading ? "Importing…" : <>Drop a CSV here or <button onClick={() => inputRef?.current?.click()} type="button">browse files</button></>}
        </strong>
        <span>One CSV · up to 5 MB · requires configured HDFS storage</span>
      </div>
      <p className="dataset-upload-note">Imported files are stored in HDFS; validated observation records and dataset metadata are saved in MongoDB.</p>
    </section>
  );
}

function DatasetStatus({ status }) {
  const statusClass = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`dataset-status dataset-status-${statusClass}`}>{status}</span>;
}

function DatasetTable({ datasets, canManage, onDelete }) {
  if (datasets.length === 0) {
    return (
      <div className="dataset-empty-state">
        <span aria-hidden="true"><NavIcon name="search" size={21} /></span>
        <strong>No datasets match your filters</strong>
        <p>Try a different search term or filter selection.</p>
      </div>
    );
  }

  return (
    <div className="dataset-table-scroll">
      <table className="dataset-table">
        <thead>
          <tr>
            <th scope="col">Dataset</th>
            <th scope="col">Source</th>
            <th scope="col">Type</th>
            <th scope="col">Date added</th>
            <th scope="col">Records</th>
            <th scope="col">Status</th>
            {canManage && <th scope="col">Manage</th>}
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => (
            <tr key={dataset.id}>
              <td>
                <div className="dataset-name-cell">
                  <span className="dataset-file-icon"><NavIcon name="file" size={17} /></span>
                  <strong title={dataset.name}>{dataset.name}</strong>
                </div>
              </td>
              <td>{dataset.source}</td>
              <td><span className="dataset-type">{dataset.type}</span></td>
              <td>{dataset.date}</td>
              <td>{dataset.records}</td>
              <td><DatasetStatus status={dataset.status} /></td>
              {canManage && (
                <td>
                  <button className="dataset-delete-button" onClick={() => onDelete(dataset)} type="button">
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClimateDataPage() {
  const { user } = useAuth();
  const canManage = user.role === "admin";
  const [datasets, setDatasets] = useState([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [uploadMessage, setUploadMessage] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refreshDatasets = useCallback(async () => {
    const { datasets: results } = await apiRequest("/api/datasets");
    setDatasets(results.map(viewDataset));
    setLoadError("");
    setError("");
  }, []);

  useEffect(() => {
    refreshDatasets()
      .catch((requestError) => {
        setLoadError(requestError.message);
        setError(requestError.message);
      })
      .finally(() => setLoading(false));
  }, [refreshDatasets]);

  const filteredDatasets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return datasets.filter((dataset) => {
      const matchesSearch = !query
        || `${dataset.name} ${dataset.source} ${dataset.type}`.toLowerCase().includes(query);
      const matchesSource = sourceFilter === "All sources" || dataset.source === sourceFilter;
      const matchesStatus = statusFilter === "All statuses" || dataset.status === statusFilter;
      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [datasets, search, sourceFilter, statusFilter]);

  async function importFiles(files) {
    setUploadMessage("");
    setError("");
    if (files.length !== 1) {
      setError("Choose one CSV file at a time.");
      return;
    }

    const [file] = files;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Climate observation imports must be CSV files.");
      return;
    }
    if (file.size === 0 || file.size > maximumFileSize) {
      setError("Choose a non-empty CSV file that is 5 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { upload } = await apiRequest("/api/ingestion/uploads", {
        method: "POST",
        body: formData
      });
      await refreshDatasets();
      setUploadMessage(`${upload.originalFilename} imported successfully (${upload.recordCount.toLocaleString()} observations).`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDataset(dataset) {
    if (!window.confirm(`Delete the metadata for "${dataset.name}"?`)) return;
    try {
      await apiRequest(`/api/datasets/${dataset.id}`, { method: "DELETE" });
      setDatasets((current) => current.filter((entry) => entry.id !== dataset.id));
      setUploadMessage("Dataset metadata deleted. This does not delete the original file or observation records.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="admin-dashboard climate-data-page">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">CLIMATE INTELLIGENCE <span>·</span> DATA CATALOG</p>
          <h1>Climate data</h1>
          <p>Browse incoming observations and prepare datasets for analysis.</p>
        </div>
        <div className="dataset-catalog-count">
          <strong>{datasets.length.toLocaleString()}</strong>
          <span>datasets in catalog</span>
        </div>
      </header>

      {canManage ? (
        <UploadPanel onFilesSelected={importFiles} uploading={uploading} />
      ) : (
        <div className="sample-data-banner">
          <span className="sample-data-indicator" />
          Dataset uploads and management are available to Admin accounts. Analysts can browse the catalog.
        </div>
      )}

      {error && <p aria-live="polite" className="dataset-upload-feedback is-error" role="alert">{error}</p>}
      {uploadMessage && <p aria-live="polite" className="dataset-upload-feedback">{uploadMessage}</p>}

      <section aria-labelledby="dataset-list-heading" className="dashboard-panel dataset-list-panel">
        <div className="dataset-list-heading">
          <div>
            <h2 id="dataset-list-heading">Dataset catalog</h2>
            <p>{loading ? "Loading datasets…" : `${filteredDatasets.length} of ${datasets.length} datasets shown`}</p>
          </div>
        </div>

        <div className="dataset-toolbar">
          <label className="dataset-search">
            <NavIcon name="search" size={16} />
            <input
              aria-label="Search datasets"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search datasets..."
              type="search"
              value={search}
            />
          </label>
          <label className="dataset-filter">
            <span className="visually-hidden">Filter by data source</span>
            <select onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}>
              <option>All sources</option>
              {Object.values(sourceLabels).map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label className="dataset-filter">
            <span className="visually-hidden">Filter by status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>All statuses</option>
              {Object.values(statusLabels).map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {loadError && datasets.length === 0
          ? <div className="dataset-empty-state"><strong>Could not load datasets</strong><p>{loadError}</p></div>
          : <DatasetTable datasets={filteredDatasets} canManage={canManage} onDelete={deleteDataset} />}
      </section>
      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Climate data catalog</span>
        <span className="data-refresh"><span /> Live catalog · Express API</span>
      </footer>
    </div>
  );
}
