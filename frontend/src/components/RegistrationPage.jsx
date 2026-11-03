import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api.js";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password })
      });
      navigate("/login", {
        replace: true,
        state: { message: "Analyst account created. Sign in with your new account." }
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section aria-labelledby="registration-heading" className="auth-card">
        <Link aria-label="EarthScape home" className="auth-brand" to="/">
          <span className="auth-brand-mark">E</span>
          <span>EarthScape <small>Climate Agency</small></span>
        </Link>
        <p className="eyebrow">CLIMATE DATA WORKSPACE</p>
        <h1 id="registration-heading">Create an Analyst account</h1>
        <p className="auth-description">Register to access climate analysis and monitoring tools.</p>

        <div className="auth-role-note">
          New public accounts are Analyst accounts. Administrator access cannot be selected here.
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email address</span>
            <input
              autoComplete="email"
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
              autoComplete="new-password"
              maxLength={72}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <small>Use at least 12 characters. Passwords must not exceed 72 bytes.</small>
          </label>
          <label>
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              maxLength={72}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button className="auth-submit" disabled={loading} type="submit">
            {loading ? "Creating account…" : "Create Analyst account"}
          </button>
        </form>

        <p className="auth-page-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
