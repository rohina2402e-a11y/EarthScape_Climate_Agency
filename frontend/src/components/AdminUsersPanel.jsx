import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api.js";

export default function AdminUsersPanel({ onError }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const result = await apiRequest("/api/users");
      setUsers(result.users);
    } catch (error) {
      onError(error);
    }
  }, [onError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function createAnalyst(event) {
    event.preventDefault();
    setSaving(true);
    onError(null);
    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setEmail("");
      setPassword("");
      await loadUsers();
    } catch (error) {
      onError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card panel-card">
      <div className="card-body p-4">
        <h2 className="h5 mb-1">Analyst accounts</h2>
        <p className="text-secondary small mb-4">New Analysts must change this temporary password when they sign in.</p>
        <form className="row g-3 align-items-end mb-4" onSubmit={createAnalyst}>
          <div className="col-md-5">
            <label className="form-label" htmlFor="newAnalystEmail">Analyst email</label>
            <input
              autoComplete="off"
              className="form-control"
              id="newAnalystEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength="254"
              required
            />
          </div>
          <div className="col-md-5">
            <label className="form-label" htmlFor="newAnalystPassword">Temporary password</label>
            <input
              autoComplete="new-password"
              className="form-control"
              id="newAnalystPassword"
              type="password"
              minLength="12"
              maxLength="72"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="col-md-2 d-grid">
            <button className="btn btn-forest" type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        <p className="small text-secondary">Share temporary passwords with users through a separate secure channel.</p>
        {users.length === 0 ? (
          <p className="text-secondary small mb-0">No accounts found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Password status</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td className="text-capitalize">{user.role}</td>
                    <td>{user.passwordChangeRequired ? "Change required" : "Set"}</td>
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
