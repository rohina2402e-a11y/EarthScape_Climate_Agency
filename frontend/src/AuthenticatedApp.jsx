import { useCallback, useEffect, useState } from "react";
import AdminUsersPanel from "./components/AdminUsersPanel.jsx";
import ClimateUploadPanel from "./components/ClimateUploadPanel.jsx";
import LoginPage from "./components/LoginPage.jsx";
import PasswordPanel from "./components/PasswordPanel.jsx";
import { apiRequest, clearSession } from "./services/api.js";

const initialForm = {
  sourceType: "weather_station",
  sourceId: "",
  observedAt: new Date().toISOString().slice(0, 16),
  latitude: "",
  longitude: "",
  measurementName: "temperature",
  value: "",
  unit: "°C"
};

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function AuthenticatedApp() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [observations, setObservations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [connection, setConnection] = useState("checking");
  const [hdfsConfigured, setHdfsConfigured] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);

  const signOut = useCallback((message = "") => {
    clearSession();
    setUser(null);
    setObservations([]);
    setCheckingSession(false);
    setError(message);
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem("earthscapeToken")) {
      setCheckingSession(false);
      return;
    }

    apiRequest("/api/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => signOut("Your session expired. Please sign in again."))
      .finally(() => setCheckingSession(false));
  }, [signOut]);

  const loadObservations = useCallback(async () => {
    try {
      const result = await apiRequest("/api/observations");
      setObservations(result.observations);
      setError("");
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut("Your session expired. Please sign in again.");
      } else {
        setError(requestError.message);
      }
    }
  }, [signOut]);

  const handlePanelError = useCallback((nextError) => {
    setError(nextError?.message ?? "");
  }, []);

  useEffect(() => {
    if (!user || user.passwordChangeRequired) return;

    apiRequest("/api/health", { auth: false })
      .then((health) => {
        setConnection(health.database);
        setHdfsConfigured(health.hdfs === "configured");
      })
      .catch(() => setConnection("unavailable"));
    loadObservations();
  }, [user, loadObservations]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitObservation(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      sourceType: form.sourceType,
      sourceId: form.sourceId,
      observedAt: new Date(form.observedAt).toISOString(),
      location: {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude)
      },
      measurements: [{
        name: form.measurementName,
        value: Number(form.value),
        unit: form.unit
      }]
    };

    try {
      await apiRequest("/api/observations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setForm({ ...initialForm, observedAt: new Date().toISOString().slice(0, 16) });
      await loadObservations();
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut("Your session expired. Please sign in again.");
      } else {
        setError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (checkingSession) {
    return <main className="login-shell"><p className="text-secondary">Checking your session...</p></main>;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} message={error} />;
  }

  if (user.passwordChangeRequired) {
    return (
      <main className="login-shell">
        <div className="password-required">
          <PasswordPanel forced onChanged={() => signOut("Password updated. Sign in with your new password.")} />
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <nav className="navbar navbar-expand-lg border-bottom bg-white">
        <div className="container py-2">
          <a className="navbar-brand fw-semibold d-flex align-items-center gap-2" href="#">
            <span className="brand-mark" aria-hidden="true">E</span>
            EarthScape <span className="brand-subtitle">Climate Agency</span>
          </a>
          <div className="d-flex align-items-center gap-2">
            <span className={`connection-badge ${connection === "connected" ? "is-connected" : ""}`}>
              <span className="connection-dot" />
              Database {connection}
            </span>
            <span className="user-role text-capitalize">{user.role}</span>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="container page-content">
        <header className="page-heading">
          <p className="eyebrow mb-2">CLIMATE DATA WORKSPACE</p>
          <h1>Observation overview</h1>
          <p className="text-secondary mb-0">Signed in as {user.email}. Add and review climate observations.</p>
        </header>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="mb-4">
          <ClimateUploadPanel
            hdfsConfigured={hdfsConfigured}
            onError={handlePanelError}
            onImported={loadObservations}
          />
        </div>

        {user.role === "admin" && (
          <div className="mb-4">
            <AdminUsersPanel onError={handlePanelError} />
          </div>
        )}

        <div className="row g-4 align-items-start">
          <section className="col-lg-5" aria-labelledby="add-observation-title">
            <div className="card panel-card">
              <div className="card-body p-4">
                <h2 id="add-observation-title" className="h5 mb-1">Add an observation</h2>
                <p className="text-secondary small mb-4">Enter one reading from a climate data source.</p>
                <form onSubmit={submitObservation}>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="sourceType">Source type</label>
                    <select className="form-select" id="sourceType" name="sourceType" value={form.sourceType} onChange={updateField}>
                      <option value="satellite">Satellite</option>
                      <option value="weather_station">Weather station</option>
                      <option value="environmental_sensor">Environmental sensor</option>
                    </select>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="sourceId">Source ID</label>
                      <input className="form-control" id="sourceId" name="sourceId" value={form.sourceId} onChange={updateField} maxLength="100" required />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="observedAt">Observed at</label>
                      <input className="form-control" type="datetime-local" id="observedAt" name="observedAt" value={form.observedAt} onChange={updateField} required />
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="latitude">Latitude</label>
                      <input className="form-control" type="number" id="latitude" name="latitude" min="-90" max="90" step="any" value={form.latitude} onChange={updateField} required />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="longitude">Longitude</label>
                      <input className="form-control" type="number" id="longitude" name="longitude" min="-180" max="180" step="any" value={form.longitude} onChange={updateField} required />
                    </div>
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-sm-5">
                      <label className="form-label" htmlFor="measurementName">Measurement</label>
                      <input className="form-control" id="measurementName" name="measurementName" value={form.measurementName} onChange={updateField} maxLength="100" required />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label" htmlFor="value">Value</label>
                      <input className="form-control" type="number" id="value" name="value" step="any" value={form.value} onChange={updateField} required />
                    </div>
                    <div className="col-sm-3">
                      <label className="form-label" htmlFor="unit">Unit</label>
                      <input className="form-control" id="unit" name="unit" value={form.unit} onChange={updateField} maxLength="32" required />
                    </div>
                  </div>
                  <button className="btn btn-forest w-100" type="submit" disabled={saving || connection !== "connected"}>
                    {saving ? "Saving..." : "Save observation"}
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section className="col-lg-7" aria-labelledby="recent-observations-title">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 id="recent-observations-title" className="h5 mb-1">Recent observations</h2>
                <p className="text-secondary small mb-0">Latest records stored in the database</p>
              </div>
              <span className="record-count">{observations.length} records</span>
            </div>
            <div className="card panel-card">
              {observations.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon" aria-hidden="true">◎</span>
                  <h3 className="h6">No observations yet</h3>
                  <p className="text-secondary small mb-0">Save a sample reading to see it here.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {observations.map((observation) => (
                    <article className="list-group-item observation-row" key={observation._id}>
                      <div className="d-flex justify-content-between gap-3">
                        <div>
                          <span className="source-label">{observation.sourceType.replaceAll("_", " ")}</span>
                          <h3 className="h6 mt-2 mb-1">{observation.sourceId}</h3>
                          <p className="text-secondary small mb-0">
                            {observation.location.latitude}, {observation.location.longitude}
                            <span className="mx-2">·</span>
                            {formatDate(observation.observedAt)}
                          </p>
                        </div>
                        <div className="text-end">
                          <strong className="reading-value">
                            {observation.measurements[0].value} {observation.measurements[0].unit}
                          </strong>
                          <div className="text-secondary small">{observation.measurements[0].name}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-4">
          <button className="btn btn-link btn-sm px-0" type="button" onClick={() => setShowPasswordPanel((shown) => !shown)}>
            {showPasswordPanel ? "Hide password settings" : "Change password"}
          </button>
          {showPasswordPanel && (
            <PasswordPanel onChanged={() => signOut("Password updated. Sign in with your new password.")} />
          )}
        </section>
        <footer className="page-footer">EarthScape Climate Agency <span>·</span> Development workspace</footer>
      </div>
    </main>
  );
}
