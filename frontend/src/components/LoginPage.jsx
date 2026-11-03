import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api.js";
import { homePathForUser } from "../auth/ProtectedRoutes.jsx";

export default function LoginPage({ onLogin, message }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(message ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(message ?? "");
  }, [message]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password })
      });
      sessionStorage.setItem("earthscapeToken", result.token);
      onLogin(result.user);
      navigate(
        result.user.passwordChangeRequired
          ? "/change-password"
          : location.state?.from?.pathname ?? homePathForUser(result.user),
        { replace: true }
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="card panel-card login-card">
        <div className="card-body p-4 p-md-5">
          <div className="login-brand mb-4">
            <span className="brand-mark" aria-hidden="true">E</span>
            <span>EarthScape <span className="brand-subtitle">Climate Agency</span></span>
          </div>
          <p className="eyebrow mb-2">CLIMATE DATA WORKSPACE</p>
          <h1 className="h3 mb-2">Welcome back</h1>
          <p className="text-secondary mb-4">Sign in to your climate monitoring workspace.</p>

          {error && <div className="alert alert-danger" role="alert">{error}</div>}

          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="loginEmail">Email address</label>
              <input
                autoComplete="username"
                className="form-control"
                id="loginEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength="254"
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="loginPassword">Password</label>
              <input
                autoComplete="current-password"
                className="form-control"
                id="loginPassword"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                maxLength="72"
                required
              />
            </div>
            <button className="btn btn-forest w-100" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="auth-page-footer">
            New to EarthScape? <Link to="/register">Create an Analyst account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
