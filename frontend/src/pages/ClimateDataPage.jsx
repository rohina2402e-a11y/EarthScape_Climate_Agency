import { useMemo, useRef, useState } from "react";
import NavIcon from "../components/NavIcon.jsx";
import { climateSources, initialClimateDatasets } from "../data/climateDatasets.js";

const allowedExtensions = [".csv", ".json"];
const maximumFileSize = 50 * 1024 * 1024;

function formatFileDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getFileType(fileName) {
  const extension = fileName.split(".").pop();
  return extension ? extension.toUpperCase() : "FILE";
}

function UploadPanel({ onFilesSelected }) {
  const inputRef = useRef(null);
  const [source, setSource] = useState(climateSources[0]);
  const [isDragging, setIsDragging] = useState(false);

  function acceptFiles(fileList) {
    onFilesSelected(Array.from(fileList), source);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section aria-labelledby="upload-heading" className="dataset-upload-panel">
      <div className="dataset-upload-heading">
        <div className="dataset-upload-icon"><NavIcon name="upload" size={19} /></div>
        <div>
          <h2 id="upload-heading">Add climate data</h2>
          <p>Choose a data source, then select CSV or JSON files.</p>
        </div>
      </div>
      <label className="dataset-source-field">
        <span>Data source</span>
        <select value={source} onChange={(event) => setSource(event.target.value)}>
          {climateSources.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
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
          accept={allowedExtensions.join(",")}
          className="visually-hidden"
          multiple
          onChange={(event) => acceptFiles(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <span aria-hidden="true" className="dataset-dropzone-icon"><NavIcon name="upload" size={20} /></span>
        <strong>Drop files here or <button onClick={() => inputRef.current?.click()} type="button">browse files</button></strong>
        <span>CSV or JSON · up to 50 MB per file</span>
      </div>
      <p className="dataset-upload-note">Frontend preview only. Files are listed locally and are not sent to the server.</p>
    </section>
  );
}

function DatasetStatus({ status }) {
  const statusClass = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`dataset-status dataset-status-${statusClass}`}>{status}</span>;
}

function DatasetTable({ datasets }) {
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
              <td>{dataset.records ?? "—"}</td>
              <td><DatasetStatus status={dataset.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ClimateDataPage() {
  const [datasets, setDatasets] = useState(initialClimateDatasets);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [uploadMessage, setUploadMessage] = useState("");
  const nextLocalId = useRef(0);

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

  function addLocalFiles(files, source) {
    if (files.length === 0) return;
    const accepted = [];
    const rejected = [];

    files.forEach((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!allowedExtensions.includes(extension)) {
        rejected.push(`${file.name}: choose a CSV or JSON file`);
      } else if (file.size > maximumFileSize) {
        rejected.push(`${file.name}: file must be 50 MB or smaller`);
      } else {
        accepted.push({
          id: `local-upload-${nextLocalId.current += 1}`,
          name: file.name,
          source,
          type: getFileType(file.name),
          date: formatFileDate(new Date()),
          status: "Ready to import",
          records: null
        });
      }
    });

    if (accepted.length > 0) {
      setDatasets((current) => [...accepted, ...current]);
    }

    const message = [
      accepted.length > 0 ? `${accepted.length} file${accepted.length === 1 ? "" : "s"} added to the local preview queue.` : "",
      rejected.length > 0 ? `Not added: ${rejected.join("; ")}.` : ""
    ].filter(Boolean).join(" ");
    setUploadMessage(message);
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
          <strong>1,284</strong>
          <span>catalog datasets</span>
        </div>
      </header>

      <div className="sample-data-banner">
        <span className="sample-data-indicator" />
        Sample catalog entries are illustrative. No files are uploaded or processed in this frontend preview.
      </div>

      <UploadPanel onFilesSelected={addLocalFiles} />

      {uploadMessage && <p aria-live="polite" className="dataset-upload-feedback">{uploadMessage}</p>}

      <section aria-labelledby="dataset-list-heading" className="dashboard-panel dataset-list-panel">
        <div className="dataset-list-heading">
          <div>
            <h2 id="dataset-list-heading">Dataset catalog</h2>
            <p>{filteredDatasets.length} of {datasets.length} sample and local-preview datasets shown</p>
          </div>
        </div>

        <div className="dataset-toolbar">
          <label className="dataset-search">
            <NavIcon name="search" size={17} />
            <span className="visually-hidden">Search datasets</span>
            <input
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
              {climateSources.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label className="dataset-filter">
            <span className="visually-hidden">Filter by status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>All statuses</option>
              <option>Processed</option>
              <option>Under review</option>
              <option>Needs attention</option>
              <option>Ready to import</option>
            </select>
          </label>
        </div>

        <DatasetTable datasets={filteredDatasets} />
      </section>
      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Climate data catalog</span>
        <span className="data-refresh"><span /> Sample catalog · updated 03 Nov 2026</span>
      </footer>
    </div>
  );
}
