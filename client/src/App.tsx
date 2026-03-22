import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";
const TOKEN_KEY = "classroom_api_token";
const isAuthBypassEnabled = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

type UserRole = "user" | "admin";

type CurrentUser = {
  id: number;
  email: string;
  role: UserRole;
  apiCallsUsed: number;
};

type UsageRow = {
  id: number;
  email: string;
  role: UserRole;
  apiCallsUsed: number;
};

const mockUsers: Record<UserRole, CurrentUser> = {
  user: {
    id: 101,
    email: "john@john.com",
    role: "user",
    apiCallsUsed: 4,
  },
  admin: {
    id: 1,
    email: "admin@admin.com",
    role: "admin",
    apiCallsUsed: 0,
  },
};

const mockUsageRows: UsageRow[] = [
  {
    id: 1,
    email: "admin@admin.com",
    role: "admin",
    apiCallsUsed: 0,
  },
  {
    id: 101,
    email: "john@john.com",
    role: "user",
    apiCallsUsed: 4,
  },
  {
    id: 102,
    email: "sarah@school.com",
    role: "user",
    apiCallsUsed: 12,
  },
];

function App() {
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">(
    "checking"
  );
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [message, setMessage] = useState("");

  const callsRemaining = useMemo(() => {
    if (!currentUser || currentUser.role !== "user") {
      return null;
    }

    const freeLimit = 20;
    return Math.max(0, freeLimit - currentUser.apiCallsUsed);
  }, [currentUser]);

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((body) => {
        setApiStatus(body?.ok ? "ok" : "error");
      })
      .catch(() => setApiStatus("error"));
  }, []);

  useEffect(() => {
    if (isAuthBypassEnabled) {
      return;
    }

    if (!token) {
      setCurrentUser(null);
      return;
    }

    void loadCurrentUser(token);
  }, [token]);

  useEffect(() => {
    if (isAuthBypassEnabled) {
      if (currentUser?.role === "admin") {
        setUsageRows(mockUsageRows);
      } else {
        setUsageRows([]);
      }
      return;
    }

    if (!token || currentUser?.role !== "admin") {
      setUsageRows([]);
      return;
    }

    void loadAdminUsage(token);
  }, [token, currentUser?.role]);

  async function loadCurrentUser(authToken: string) {
    setLoadingUser(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load user session.");
      }

      const body = await response.json();
      const mappedUser = mapCurrentUser(body);

      if (!mappedUser) {
        throw new Error("Server response format is not valid for /auth/me.");
      }

      setCurrentUser(mappedUser);
    } catch (error) {
      clearSession();
      setMessage(error instanceof Error ? error.message : "Session expired.");
    } finally {
      setLoadingUser(false);
    }
  }

  async function loadAdminUsage(authToken: string) {
    setLoadingUsage(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/admin/usage`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load admin usage table.");
      }

      const body = await response.json();
      const rows = mapUsageRows(body);
      setUsageRows(rows);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load usage table."
      );
    } finally {
      setLoadingUsage(false);
    }
  }

  async function onLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed. Check credentials.");
      }

      const body = await response.json();
      const nextToken = readToken(body);

      if (!nextToken) {
        throw new Error("Login response missing token.");
      }

      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);

      const mappedUser = mapCurrentUser(body);
      if (mappedUser) {
        setCurrentUser(mappedUser);
      }

      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  function enterPreview(role: UserRole) {
    const mockUser = mockUsers[role];
    const previewToken = `dev-bypass-${role}`;

    localStorage.setItem(TOKEN_KEY, previewToken);
    setToken(previewToken);
    setCurrentUser(mockUser);
    setUsageRows(role === "admin" ? mockUsageRows : []);
    setMessage("");
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setUsageRows([]);
  }

  return (
    <main className="app-shell">
      <section className="panel header-panel">
        <h1>Classroom Assistant Dashboard</h1>
        <p className="muted">
          API {apiBase}:
          {apiStatus === "checking" && " checking..."}
          {apiStatus === "ok" && " connected"}
          {apiStatus === "error" && " unreachable"}
        </p>
      </section>

      {!token && (
        <section className="panel auth-panel">
          <h2>Login</h2>
          <form onSubmit={onLoginSubmit} className="form-grid">
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit">Sign in</button>
          </form>
          {isAuthBypassEnabled && (
            <div className="dev-preview-actions">
              <button type="button" onClick={() => enterPreview("user")}>
                Preview User Dashboard
              </button>
              <button type="button" onClick={() => enterPreview("admin")}>
                Preview Admin Dashboard
              </button>
            </div>
          )}
          <p className="muted small-note">
            This UI expects: POST /auth/login, GET /auth/me, GET /admin/usage.
          </p>
          {isAuthBypassEnabled && (
            <p className="muted small-note">
              Dev auth bypass is ON (VITE_DEV_BYPASS_AUTH=true).
            </p>
          )}
        </section>
      )}

      {token && loadingUser && (
        <section className="panel">
          <p>Loading session...</p>
        </section>
      )}

      {token && currentUser?.role === "user" && (
        <section className="panel user-panel">
          <div className="panel-title-row">
            <h2>User Dashboard</h2>
            <button type="button" onClick={clearSession}>
              Logout
            </button>
          </div>

          <p>
            Signed in as <strong>{currentUser.email}</strong>
          </p>
          <div className="stats-grid">
            <article className="stat-box">
              <h3>API Calls Used</h3>
              <p>{currentUser.apiCallsUsed}</p>
            </article>
            <article className="stat-box">
              <h3>Free Calls Remaining</h3>
              <p>{callsRemaining ?? 0}</p>
            </article>
          </div>
        </section>
      )}

      {token && currentUser?.role === "admin" && (
        <section className="panel admin-panel">
          <div className="panel-title-row">
            <h2>Admin Dashboard</h2>
            <div className="row-actions">
              <button
                type="button"
                onClick={() => token && loadAdminUsage(token)}
                disabled={loadingUsage || isAuthBypassEnabled}
              >
                {loadingUsage ? "Refreshing..." : "Refresh usage"}
              </button>
              <button type="button" onClick={clearSession}>
                Logout
              </button>
            </div>
          </div>

          <p>
            Signed in as <strong>{currentUser.email}</strong>
          </p>

          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>API Calls Used</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>{loadingUsage ? "Loading..." : "No user data"}</td>
                </tr>
              ) : (
                usageRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.email}</td>
                    <td>{row.role}</td>
                    <td>{row.apiCallsUsed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {message && (
        <section className="panel">
          <p className="error-text">{message}</p>
        </section>
      )}
    </main>
  );
}

function readToken(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const token = Reflect.get(body, "token");
  return typeof token === "string" && token.length > 0 ? token : null;
}

function mapCurrentUser(body: unknown): CurrentUser | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const userCandidate =
    (Reflect.get(body, "user") as Record<string, unknown> | undefined) ??
    (body as Record<string, unknown>);

  const id = Number(userCandidate.id);
  const email = userCandidate.email;
  const role = userCandidate.role;
  const apiCallsUsed = Number(
    userCandidate.apiCallsUsed ?? userCandidate.api_calls_used ?? 0
  );

  if (!Number.isFinite(id) || typeof email !== "string") {
    return null;
  }

  if (role !== "user" && role !== "admin") {
    return null;
  }

  return {
    id,
    email,
    role,
    apiCallsUsed: Number.isFinite(apiCallsUsed) ? apiCallsUsed : 0,
  };
}

function mapUsageRows(body: unknown): UsageRow[] {
  const dataSource = Array.isArray(body)
    ? body
    : Array.isArray((body as { users?: unknown[] })?.users)
      ? ((body as { users: unknown[] }).users ?? [])
      : [];

  return dataSource
    .map((entry) => mapCurrentUser(entry))
    .filter((entry): entry is UsageRow => entry !== null);
}

export default App;
