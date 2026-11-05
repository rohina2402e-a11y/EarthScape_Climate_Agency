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
    <main className="auth-page">
      <section aria-labelledby="login-heading" className="auth-card">
        <Link aria-label="EarthScape home" className="auth-brand" to="/">
          <span aria-hidden="true" className="auth-brand-mark">E</span>
          <span>EarthScape <small>Climate Agency</small></span>
        </Link>
        <p className="eyebrow">CLIMATE DATA WORKSPACE</p>
        <h1 id="login-heading">Welcome back</h1>
        <p className="auth-description">Sign in to your climate monitoring workspace.</p>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email address</span>
            <input
              autoComplete="username"
              id="loginEmail"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              id="loginPassword"
              maxLength={72}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button className="auth-submit" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="auth-page-footer">
          New to EarthScape? <Link to="/register">Create an Analyst account</Link>
        </p>
      </section>
    </main>
  );
}
