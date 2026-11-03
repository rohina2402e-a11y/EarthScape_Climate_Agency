import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import NavIcon from "../components/NavIcon.jsx";
import { supportCategories } from "../data/supportData.js";
import { apiRequest } from "../services/api.js";

const initialForm = { category: supportCategories[0], subject: "", message: "" };
const statusNames = { received: "Received", in_progress: "In progress", resolved: "Resolved" };

function RequestStatus({ status }) {
  const statusClass = status.replaceAll("_", "-");
  return <span className={`support-status support-status-${statusClass}`}>{statusNames[status] ?? status}</span>;
}

function SupportRequestList({ requests, canManage, onUpdate, onDelete, loading }) {
  if (loading) {
    return <div className="support-empty-state"><strong>Loading support requests…</strong></div>;
  }
  if (requests.length === 0) {
    return (
      <div className="support-empty-state">
        <span><NavIcon name="support" size={20} /></span>
        <strong>No support requests yet</strong>
        <p>Requests you submit will appear here.</p>
      </div>
    );
  }

  return (
    <div className="support-request-list">
      {requests.map((request) => (
        <article className="support-request-row" key={request.id}>
          <div className="support-request-id">ESC-{request.id.slice(-6).toUpperCase()}</div>
          <div className="support-request-copy">
            <strong>{request.subject}</strong>
            <span>
              {request.category} · Submitted {new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              }).format(new Date(request.createdAt))}
              {canManage && request.submittedBy?.email ? ` · ${request.submittedBy.email}` : ""}
            </span>
            {request.adminNote && <span>Admin response: {request.adminNote}</span>}
          </div>
          {canManage ? (
            <div className="support-request-actions">
              <select
                aria-label={`Update status for ${request.subject}`}
                onChange={(event) => onUpdate(request, event.target.value)}
                value={request.status}
              >
                {Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <button onClick={() => onDelete(request)} type="button">Delete</button>
            </div>
          ) : <RequestStatus status={request.status} />}
        </article>
      ))}
    </div>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const canManage = user.role === "admin";
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([]);
  const [formMessage, setFormMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refreshRequests = useCallback(async () => {
    const { feedback } = await apiRequest("/api/feedback");
    setRequests(feedback);
    setError("");
  }, []);

  useEffect(() => {
    refreshRequests()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [refreshRequests]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { feedback } = await apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: form.category,
          subject: form.subject.trim(),
          message: form.message.trim()
        })
      });
      setForm(initialForm);
      setRequests((current) => [feedback, ...current]);
      setFormMessage("Your request has been submitted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(request, status) {
    try {
      const { feedback } = await apiRequest(`/api/feedback/${request.id}`, {
        method: "PUT",
        body: JSON.stringify({ status, adminNote: request.adminNote ?? "" })
      });
      setRequests((current) => current.map((entry) => entry.id === request.id ? feedback : entry));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteRequest(request) {
    if (!window.confirm(`Delete the request "${request.subject}"?`)) return;
    try {
      await apiRequest(`/api/feedback/${request.id}`, { method: "DELETE" });
      setRequests((current) => current.filter((entry) => entry.id !== request.id));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="admin-dashboard support-page">
      <header className="dashboard-page-heading">
        <div>
          <p className="eyebrow">ORGANIZATION <span>·</span> HELP DESK</p>
          <h1>Feedback &amp; support</h1>
          <p>Share an idea, ask a data question, or report a technical problem.</p>
        </div>
        <div className="support-response-note">
          <span className="support-online-dot" />
          <span>{canManage ? "Administrator support queue" : "Your support requests"}</span>
        </div>
      </header>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="support-content-grid">
        <section aria-labelledby="support-form-heading" className="dashboard-panel support-form-panel">
          <div className="support-panel-heading">
            <span className="support-panel-icon"><NavIcon name="support" size={19} /></span>
            <div>
              <h2 id="support-form-heading">Send feedback or request help</h2>
              <p>Fields marked with * are required.</p>
            </div>
          </div>

          <form className="support-form" onSubmit={handleSubmit}>
            <label>
              <span>Request type <b aria-hidden="true">*</b></span>
              <select name="category" onChange={updateField} value={form.category}>
                {supportCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>

            <label>
              <span>Subject <b aria-hidden="true">*</b></span>
              <input
                maxLength={120}
                name="subject"
                onChange={updateField}
                placeholder="Briefly describe your request"
                required
                value={form.subject}
              />
            </label>

            <label>
              <span>Details <b aria-hidden="true">*</b></span>
              <textarea
                maxLength={2000}
                name="message"
                onChange={updateField}
                placeholder="Include the page or data source involved and what you expected to happen."
                required
                rows={5}
                value={form.message}
              />
              <small>{form.message.length}/2000 characters</small>
            </label>

            <div aria-live="polite" className="support-form-message is-success">{formMessage}</div>

            <button className="support-submit-button" disabled={submitting} type="submit">
              <NavIcon name="send" size={16} />
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </section>

        <aside className="support-side-column">
          <section aria-labelledby="support-guidance-heading" className="dashboard-panel support-guidance-panel">
            <div className="support-guidance-icon"><NavIcon name="check" size={18} /></div>
            <h2 id="support-guidance-heading">Help us help you</h2>
            <p>For a technical issue, include the page name, what you were doing, and any error message you saw.</p>
            <ul>
              <li>Do not include passwords or private credentials.</li>
              <li>For data questions, include the dataset or station name.</li>
              <li>Use a clear subject so the team can route your request.</li>
            </ul>
          </section>

          <section aria-labelledby="support-status-heading" className="dashboard-panel support-requests-panel">
            <div className="support-requests-heading">
              <div>
                <h2 id="support-status-heading">{canManage ? "All support requests" : "Support request status"}</h2>
                <p>{canManage ? "Review and update submitted requests" : "Your submitted requests"}</p>
              </div>
              <span className="support-request-count">{requests.length}</span>
            </div>
            <SupportRequestList
              canManage={canManage}
              loading={loading}
              onDelete={deleteRequest}
              onUpdate={updateStatus}
              requests={requests}
            />
          </section>
        </aside>
      </div>

      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Feedback &amp; support</span>
        <span className="data-refresh"><span /> Live support requests · Express API</span>
      </footer>
    </div>
  );
}
