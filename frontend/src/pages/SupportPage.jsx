import { useState } from "react";
import NavIcon from "../components/NavIcon.jsx";
import { initialSupportRequests, supportCategories } from "../data/supportData.js";

const initialForm = { category: supportCategories[0], subject: "", message: "" };

function RequestStatus({ status }) {
  const statusClass = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`support-status support-status-${statusClass}`}>{status}</span>;
}

function SupportRequestList({ requests }) {
  if (requests.length === 0) {
    return (
      <div className="support-empty-state">
        <span><NavIcon name="support" size={20} /></span>
        <strong>No support requests yet</strong>
        <p>Requests created in this preview will appear here.</p>
      </div>
    );
  }

  return (
    <div className="support-request-list">
      {requests.map((request) => (
        <article className="support-request-row" key={request.id}>
          <div className="support-request-id">{request.id}</div>
          <div className="support-request-copy">
            <strong>{request.subject}</strong>
            <span>{request.category} · Submitted {request.submitted}</span>
          </div>
          <RequestStatus status={request.status} />
        </article>
      ))}
    </div>
  );
}

export default function SupportPage() {
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState(initialSupportRequests);
  const [formMessage, setFormMessage] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFormMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!subject || !message) {
      setFormMessage("Enter a subject and describe your feedback or issue before submitting.");
      return;
    }

    const requestId = `ESC-${String(Date.now()).slice(-6)}`;
    setRequests((current) => [{
      id: requestId,
      subject,
      category: form.category,
      submitted: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date()),
      status: "Received"
    }, ...current]);
    setForm(initialForm);
    setFormMessage(`Request ${requestId} was added to this local preview. It has not been sent to support.`);
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
          <span>Support workspace</span>
        </div>
      </header>

      <div className="sample-data-banner">
        <span className="sample-data-indicator" />
        Preview only. Submissions are kept in page state and are not sent to the support team.
      </div>

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

            <div aria-live="polite" className={`support-form-message${formMessage.includes("added to this local preview") ? " is-success" : ""}`}>
              {formMessage}
            </div>

            <button className="support-submit-button" type="submit">
              <NavIcon name="send" size={16} />
              Submit request
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
                <h2 id="support-status-heading">Support request status</h2>
                <p>Sample history and local submissions</p>
              </div>
              <span className="support-request-count">{requests.length}</span>
            </div>
            <SupportRequestList requests={requests} />
          </section>
        </aside>
      </div>

      <footer className="dashboard-footer">
        <span>EarthScape Climate Agency <span className="footer-divider">·</span> Feedback &amp; support</span>
        <span className="data-refresh"><span /> Local preview only</span>
      </footer>
    </div>
  );
}
