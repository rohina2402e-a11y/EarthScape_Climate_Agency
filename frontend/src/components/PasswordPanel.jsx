import { useState } from "react";
import { apiRequest } from "../services/api.js";

export default function PasswordPanel({ forced = false, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card panel-card">
      <div className="card-body p-4">
        <h2 className="h5">{forced ? "Set a new password" : "Change your password"}</h2>
        <p className="text-secondary small">
          Use at least 12 characters. Passwords must be no more than 72 bytes.
        </p>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="currentPassword">Current password</label>
            <input
              autoComplete="current-password"
              className="form-control"
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="newPassword">New password</label>
            <input
              autoComplete="new-password"
              className="form-control"
              id="newPassword"
              type="password"
              minLength="12"
              maxLength="72"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>
          <button className="btn btn-forest" type="submit" disabled={saving}>
            {saving ? "Updating..." : "Change password"}
          </button>
        </form>
      </div>
    </section>
  );
}
