import React, { useEffect, useState, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_ORIGIN = import.meta.env?.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "" : "http://localhost:4000");
const BASE = `${API_ORIGIN}/api`;
let _token = localStorage.getItem("pf_token") || "";
const setToken = (t) => { _token = t; localStorage.setItem("pf_token", t); };
const clearToken = () => { _token = ""; localStorage.removeItem("pf_token"); };

async function api(method, path, body, signal) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${_token}` },
    signal,
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Icons (inline SVG, zero dependencies) ────────────────────────────────────
const Ic = ({ d, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d={d} />
  </svg>
);
const Icons = {
  Sparkles:   "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  Dashboard:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  FileText:   "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  Mic:        "M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3 M8 22h8",
  Brain:      "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z",
  History:    "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l4 2",
  BookOpen:   "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  Settings:   "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15A3 3 0 1 0 12 9a3 3 0 0 0 0 6z",
  Target:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  ArrowRight: "M5 12h14 M12 5l7 7-7 7",
  Play:       "M5 3l14 9-14 9V3z",
  Upload:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  Check:      "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
  X:          "M18 6 6 18 M6 6l12 12",
  LogOut:     "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  User:       "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  Menu:       "M4 6h16M4 12h16M4 18h16",
  Star:       "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  Zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  Trophy:     "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2z",
  Sun:        "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  Moon:       "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  Palette:    "M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.21-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z",
  File:       "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  Edit:       "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
};
const Icon = ({ name, size = 18, className = "" }) =>
  Icons[name] ? <Ic d={Icons[name]} size={size} className={className} /> : null;

// ─── Markdown renderer (safe, structured, with table & codeblock support) ─────
function renderMarkdown(raw) {
  if (!raw || typeof raw !== "string") return "";

  // 1. Isolate code blocks
  const codeBlocks = [];
  let s = raw.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = `__CODEBLOCK_${codeBlocks.length}__`;
    codeBlocks.push(
      `<pre><code class="language-${lang || 'text'}">${code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</code></pre>`
    );
    return id;
  });

  // 2. Escape HTML entities
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 3. Convert markdown tables
  s = s.replace(/((?:^\|[^\n]+\|\r?\n)+)/gm, (match) => {
    const rows = match.trim().split(/\r?\n/).map(r => r.trim()).filter(Boolean);
    if (rows.length < 2) return match;
    const isDivider = (row) => /^\|(\s*:?-+:?\s*\|)+$/.test(row);
    let html = '<div class="table-wrap"><table class="ai-table">';
    let inBody = false;

    rows.forEach((row, idx) => {
      if (isDivider(row)) return;
      const cells = row.split("|").slice(1, -1).map(c => c.trim());
      if (idx === 0) {
        html += "<thead><tr>";
        cells.forEach(c => { html += `<th>${c}</th>`; });
        html += "</tr></thead><tbody>";
        inBody = true;
      } else {
        html += "<tr>";
        cells.forEach(c => { html += `<td>${c}</td>`; });
        html += "</tr>";
      }
    });
    if (inBody) html += "</tbody>";
    html += "</table></div>";
    return html;
  });

  // 4. Headers
  s = s.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  s = s.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  s = s.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // 5. Blockquotes
  s = s.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  // 6. Inline formatting
  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 7. Group Bullet lists
  s = s.replace(/((?:^[-•*]\s+[^\n]+\r?\n?)+)/gm, (match) => {
    const items = match.trim().split(/\r?\n/).map(line => line.replace(/^[-•*]\s+/, "").trim());
    return `<ul>${items.map(it => `<li>${it}</li>`).join("")}</ul>`;
  });

  // 8. Group Numbered lists
  s = s.replace(/((?:^\d+\.\s+[^\n]+\r?\n?)+)/gm, (match) => {
    const items = match.trim().split(/\r?\n/).map(line => line.replace(/^\d+\.\s+/, "").trim());
    return `<ol>${items.map(it => `<li>${it}</li>`).join("")}</ol>`;
  });

  // 9. Paragraphs and linebreaks
  const blocks = s.split(/\n{2,}/);
  s = blocks.map(b => {
    const trimmed = b.trim();
    if (!trimmed) return "";
    if (/^<(h[1-6]|ul|ol|table|div|blockquote|pre)/i.test(trimmed)) return trimmed;
    return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");

  // 10. Restore code blocks
  codeBlocks.forEach((block, idx) => {
    s = s.replace(`__CODEBLOCK_${idx}__`, block);
  });

  return s;
}

function Markdown({ text }) {
  if (!text) return null;
  const html = renderMarkdown(text);
  return <div className="ai-result" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const Ctx = React.createContext(null);

// ─── App root ─────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);        // logged-in user
  const [state, setState] = useState(null);       // full app state
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("pf_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pf_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === "light" ? "dark" : "light"));
  }, []);

  // Try to restore session
  useEffect(() => {
    if (!_token) { setLoading(false); return; }
    api("GET", "/auth/me")
      .then((u) => { setUser(u); return api("GET", "/state"); })
      .then(setState)
      .catch(() => { clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (token, userData) => {
    setToken(token);
    setUser(userData);
    const s = await api("GET", "/state");
    setState(s);
    setTab("Dashboard");
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setState(null);
    setTab("Dashboard");
  }, []);

  const refreshState = useCallback(async () => {
    const s = await api("GET", "/state");
    setState(s);
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="spinner" />
    </div>
  );

  if (!user) return <AuthPage mode={authMode} setMode={setAuthMode} onLogin={login} />;

  const ctxVal = { user, state, setState, refreshState, logout, theme, toggleTheme };

  return (
    <Ctx.Provider value={ctxVal}>
      <div className="app-shell fade-in">
        {/* Header */}
        <header className="header">
          <div className="header-inner">
            <button className="logo" onClick={() => setTab("Dashboard")}>
              <span className="logo-icon">✦</span>
              PrepForge
            </button>
            <div className="header-actions">
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === "light" ? "Switch to Dark (Rich Walnut)" : "Switch to Light (Espresso & Cream)"}
              >
                <Icon name={theme === "light" ? "Moon" : "Sun"} size={15} />
                <span className="theme-toggle-label">{theme === "light" ? "☕ Espresso & Cream" : "🌰 Rich Walnut"}</span>
              </button>
              <button className="mobile-menu-toggle" onClick={() => setMobileMenu(true)} title="Open navigation menu">
                <Icon name="Menu" size={18} />
              </button>
              <div className="user-chip" onClick={() => setTab("Settings")}>
                <div className="user-avatar">{(user.name || "U")[0].toUpperCase()}</div>
                <span className="user-chip-name">{user.name?.split(" ")[0]}</span>
              </div>
              <button className="btn btn-secondary btn-sm btn-icon desktop-only" onClick={logout} title="Logout">
                <Icon name="LogOut" size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenu && (
          <>
            <div className="mobile-drawer-overlay" onClick={() => setMobileMenu(false)} />
            <div className="mobile-drawer">
              <div className="mobile-drawer-header">
                <div className="logo" style={{ cursor: "default" }}>
                  <span className="logo-icon" style={{ width: 30, height: 30, fontSize: 14 }}>✦</span>
                  PrepForge
                </div>
                <button
                  className="btn btn-secondary btn-sm btn-icon"
                  onClick={() => setMobileMenu(false)}
                  style={{ width: 32, height: 32, padding: 0 }}
                  title="Close Menu"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>

              <div className="mobile-drawer-body">
                {/* User chip summary */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", borderRadius: 12, marginBottom: 8 }}>
                  <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 15 }}>{(user.name || "U")[0].toUpperCase()}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{user.target_role || user.email}</div>
                  </div>
                </div>

                <div className="sidebar-label" style={{ padding: "8px 10px 4px" }}>Menu</div>
                {NAV_MAIN.map(({ name, icon }) => (
                  <button
                    key={name}
                    className={`nav-btn ${tab === name ? "active" : ""}`}
                    onClick={() => { setTab(name); setMobileMenu(false); }}
                  >
                    <Icon name={icon} size={16} className="nav-icon" />{name}
                  </button>
                ))}

                <div className="sidebar-label" style={{ marginTop: 14, padding: "8px 10px 4px" }}>AI Tools</div>
                {TOOL_GROUPS.map(g => (
                  <div key={g.title} style={{ marginBottom: 4 }}>
                    <div className="sidebar-label" style={{ padding: "4px 10px 2px", fontSize: 10, color: "var(--accent)" }}>{g.title}</div>
                    {g.items.map(([short, full]) => (
                      <button
                        key={full}
                        className={`nav-sub ${tab === full ? "active" : ""}`}
                        onClick={() => { setTab(full); setMobileMenu(false); }}
                      >
                        {short}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mobile-drawer-footer">
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={toggleTheme}
                >
                  <Icon name={theme === "light" ? "Moon" : "Sun"} size={14} />
                  <span>{theme === "light" ? "Switch to Rich Walnut" : "Switch to Espresso & Cream"}</span>
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={logout}
                >
                  <Icon name="LogOut" size={14} /> Log out
                </button>
              </div>
            </div>
          </>
        )}

        {/* Body */}
        <div className="main-layout">
          <Sidebar tab={tab} setTab={setTab} />
          <main className="content-area fade-up">
            <Content tab={tab} setTab={setTab} />
          </main>
        </div>

        {/* Mobile Quick-Action Bottom Bar */}
        <nav className="mobile-bottom-nav">
          <button
            className={`bottom-nav-item ${tab === "Dashboard" ? "active" : ""}`}
            onClick={() => setTab("Dashboard")}
          >
            <Icon name="Dashboard" size={18} className="bottom-nav-icon" />
            <span>Home</span>
          </button>
          <button
            className={`bottom-nav-item ${tab === "Resume & JD" ? "active" : ""}`}
            onClick={() => setTab("Resume & JD")}
          >
            <Icon name="FileText" size={18} className="bottom-nav-icon" />
            <span>CV & JD</span>
          </button>
          <button
            className={`bottom-nav-item ${tab === "AI Practice Pack" ? "active" : ""}`}
            onClick={() => setTab("AI Practice Pack")}
          >
            <Icon name="Target" size={18} className="bottom-nav-icon" />
            <span>Practice</span>
          </button>
          <button
            className={`bottom-nav-item ${tab.includes("Voice") ? "active" : ""}`}
            onClick={() => setTab("Voice Mock — HR")}
          >
            <Icon name="Mic" size={18} className="bottom-nav-icon" />
            <span>Voice</span>
          </button>
          <button
            className="bottom-nav-item"
            onClick={() => setMobileMenu(true)}
          >
            <Icon name="Menu" size={18} className="bottom-nav-icon" />
            <span>All Tools</span>
          </button>
        </nav>
      </div>
    </Ctx.Provider>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ mode, setMode, onLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", targetRole: "", branch: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(ev) {
    ev.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = mode === "register"
        ? { name: form.name, email: form.email, password: form.password, targetRole: form.targetRole, branch: form.branch }
        : { email: form.email, password: form.password };
      const data = await fetch(`${BASE}/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; });
      onLogin(data.token, data.user);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card fade-up">
        <div className="auth-logo"><span className="logo-icon">✦</span> PrepForge</div>
        <h1 className="auth-title">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="auth-sub">{mode === "login" ? "Sign in to your interview co-pilot." : "Free. No credit card needed."}</p>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <>
              <div className="input-group">
                <label className="input-label">Full name</label>
                <input className="input" placeholder="Priya Sharma" value={form.name} onChange={set("name")} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Target role</label>
                  <input className="input" placeholder="SDE-1" value={form.targetRole} onChange={set("targetRole")} />
                </div>
                <div className="input-group">
                  <label className="input-label">Branch / Domain</label>
                  <input className="input" placeholder="CSE" value={form.branch} onChange={set("branch")} />
                </div>
              </div>
            </>
          )}
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password{mode === "register" && " (min 8 chars)"}</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required />
          </div>
          {error && <div className="alert-error">{error}</div>}
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            {!busy && <Icon name="ArrowRight" size={16} />}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? <>Don't have an account?{" "}<button onClick={() => { setMode("register"); }}>Sign up free</button></> : <>Already have an account?{" "}<button onClick={() => setMode("login")}>Sign in</button></>}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  { name: "Dashboard", icon: "Dashboard" },
  { name: "UI/UX Showcase", icon: "Sparkles" },
  { name: "Resume & JD", icon: "FileText" },
  { name: "Practice", icon: "Target" },
  { name: "History", icon: "History" },
  { name: "Resources", icon: "BookOpen" },
  { name: "Settings", icon: "Settings" },
];
const TOOL_GROUPS = [
  { title: "CV + Technical", items: [["Project Deep-Dive", "Project Deep-Dive Q&A"], ["Technical Q&A", "Technical Q&A"], ["Revision Notes", "Topic-Wise Revision Notes"]] },
  { title: "CV + HR", items: [["STAR Builder", "AI STAR Story Builder"], ["About Me", "Tell Me About Yourself"], ["Soft Skills", "HR / Soft Skills"]] },
  { title: "JD + Technical", items: [["JD Predictor", "JD Predictor"], ["Company Mock", "Company-Pattern Mock Tests"], ["Round Guide", "Interview Round Guide"]] },
  { title: "JD + HR", items: [["JD Decoder", "JD Decoder"], ["Role Fit", "Role Fit Analyzer"]] },
  { title: "CV + JD", items: [["Gap Analysis", "Resume Gap Analysis"], ["ATS Score", "Resume ATS Scorer"], ["Salary Guide", "Salary Negotiation Guide"]] },
  { title: "Practice", items: [["Aptitude", "Aptitude Practice"], ["Voice HR", "Voice Mock — HR"], ["Voice Tech", "Voice Mock — Technical"], ["Practice Pack", "AI Practice Pack"]] },
];

function Sidebar({ tab, setTab }) {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_MAIN.map(({ name, icon }) => (
          <button key={name} className={`nav-btn ${tab === name ? "active" : ""}`} onClick={() => setTab(name)}>
            <Icon name={icon} size={17} className="nav-icon" />{name}
          </button>
        ))}
      </nav>
      <div className="sidebar-label" style={{ marginTop: 20 }}>AI Tools</div>
      {TOOL_GROUPS.map(g => (
        <div key={g.title} style={{ marginBottom: 6 }}>
          <div className="sidebar-label" style={{ paddingTop: 8 }}>{g.title}</div>
          {g.items.map(([short, full]) => (
            <button key={full} className={`nav-sub ${tab === full ? "active" : ""}`} onClick={() => setTab(full)}>
              {short}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

// ─── Content router ───────────────────────────────────────────────────────────
function Content({ tab, setTab }) {
  const { state, theme, toggleTheme } = React.useContext(Ctx);
  if (!state) return <Loading />;
  if (tab === "Dashboard")       return <Dashboard setTab={setTab} />;
  if (tab === "UI/UX Showcase")  return <DesignShowcase theme={theme} toggleTheme={toggleTheme} setTab={setTab} />;
  if (tab === "Resume & JD")     return <ResumeJD />;
  if (tab === "History")         return <HistoryPage />;
  if (tab === "Resources")       return <Resources />;
  if (tab === "Settings")        return <SettingsPage />;
  if (tab === "Practice" || tab === "Aptitude Practice") return <Aptitude key={tab} />;
  if (tab === "Voice Mock — HR" || tab === "Voice Mock — Technical") return <VoiceInterview key={tab} tab={tab} />;
  if (tab === "AI Practice Pack") return <PracticePackPage key="practice-pack" />;
  return <FeaturePage key={tab} name={tab} />;
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function Loading() {
  return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function scoreMatch(a, b) {
  const A = new Set((a || "").toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []);
  const B = (b || "").toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
  if (!B.length) return 0;
  const hits = [...new Set(B)].filter(x => A.has(x));
  return Math.min(98, Math.max(20, Math.round(hits.length / Math.max(8, new Set(B).size) * 100)));
}

function Dashboard({ setTab }) {
  const { user, state } = React.useContext(Ctx);
  const readiness = scoreMatch(state.resume?.text, state.jd?.text);

  const moves = [
    { n: "01", title: "Deep-dive your projects", desc: "Get precise technical questions based on your resume.", action: "Project Deep-Dive Q&A" },
    { n: "02", title: "Identify skill gaps", desc: "Compare your skills with the job description.", action: "Resume Gap Analysis" },
    { n: "03", title: "Complete a voice mock", desc: "Practice with a real AI-powered adaptive interview.", action: "Voice Mock — HR" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div className="section-eyebrow">Your interview co-pilot</div>
        <h1 className="section-title">
          Turn preparation into{" "}
          <span style={{ color: "var(--indigo-light)" }}>confidence.</span>
        </h1>
        <p className="section-desc">
          Upload your resume, add a job description, then practice the exact questions
          your target role is likely to ask.
        </p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-label">Readiness score</div>
          <div className="stat-value" style={{ color: "var(--indigo-light)" }}>{readiness}%</div>
          <div className="stat-sub">based on CV + JD match</div>
          <div className="progress-bar" style={{ marginTop: 12 }}>
            <div className="progress-fill progress-indigo" style={{ width: readiness + "%" }} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Keyword matches</div>
          <div className="stat-value">{readiness}</div>
          <div className="stat-sub">skills aligned with JD</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Practice attempts</div>
          <div className="stat-value">{state.history?.length || 0}</div>
          <div className="stat-sub">across all modes</div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        {/* Next moves */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 800, marginBottom: 20 }}>Your next best moves</h2>
          <div className="grid-3">
            {moves.map(m => (
              <button key={m.n} className="card-glass" style={{ padding: 20, cursor: "pointer", border: "1px solid var(--border)", borderRadius: 14, textAlign: "left", background: "none", color: "inherit", transition: "border-color 0.2s" }}
                onClick={() => setTab(m.action)}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <div style={{ color: "var(--indigo-light)", fontSize: 12, fontWeight: 700 }}>{m.n}</div>
                <div style={{ fontWeight: 700, marginTop: 12 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Profile card */}
        <div className="card" style={{ padding: 24 }}>
          <div className="section-eyebrow">Profile</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,var(--indigo),#a78bfa)", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 800, color: "white" }}>
              {(user.name || "U")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{user.name}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {user.target_role && <div><span style={{ color: "var(--text-dim)", fontSize: 12 }}>Target role</span><div style={{ fontWeight: 600 }}>{user.target_role}</div></div>}
            {user.branch && <div><span style={{ color: "var(--text-dim)", fontSize: 12 }}>Branch</span><div style={{ fontWeight: 600 }}>{user.branch}</div></div>}
          </div>
          {state.history?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>Recent activity</div>
              {state.history.slice(0, 3).map((h, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--text-muted)", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text)" }}>{h.type}</span>{" — "}{h.score ?? "—"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document Extractor (PDF, DOCX, TXT) ──────────────────────────────────────
async function extractDocumentText(file) {
  const name = file.name.toLowerCase();

  // 1. Plain text / Markdown / JSON / CSV / RTF
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".rtf") ||
    name.endsWith(".json") ||
    name.endsWith(".csv")
  ) {
    return await file.text();
  }

  // 2. PDF Documents via pdfjsLib
  if (name.endsWith(".pdf")) {
    if (!window.pdfjsLib) {
      throw new Error("PDF parser is initializing. Please try again in a moment.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    const clean = fullText.trim();
    if (!clean) throw new Error("Could not extract text from this PDF (it might be a scanned image without selectable text).");
    return clean;
  }

  // 3. Word Documents (.docx) via mammoth
  if (name.endsWith(".docx")) {
    if (!window.mammoth) {
      throw new Error("Word document parser is initializing. Please try again in a moment.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    const clean = (result.value || "").trim();
    if (!clean) throw new Error("Could not extract readable text from this Word document.");
    return clean;
  }

  // Fallback
  return await file.text();
}

function DocUploaderCard({
  title,
  subtitle,
  value,
  onChange,
  fileName,
  onFileChange,
  placeholder,
  helpText
}) {
  const [mode, setMode] = useState(value ? "upload" : "upload");
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setParsing(true);
    setError("");
    try {
      const text = await extractDocumentText(file);
      onChange(text);
      if (onFileChange) onFileChange(file.name);
      setMode("upload");
    } catch (err) {
      setError(err.message || "Failed to parse document");
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="FileText" size={17} style={{ color: "var(--accent)" }} />
            {title}
          </h2>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</div>
        </div>

        {/* Mode switcher */}
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === "upload" ? "active" : ""}`}
            onClick={() => setMode("upload")}
          >
            <Icon name="Upload" size={13} />
            Upload File
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "paste" ? "active" : ""}`}
            onClick={() => setMode("paste")}
          >
            <Icon name="FileText" size={13} />
            Direct Paste
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.rtf"
        style={{ display: "none" }}
        onChange={e => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}

      {mode === "upload" ? (
        <div>
          {/* Dropzone */}
          <div
            className={`dropzone ${dragOver ? "active" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: 14 }}
          >
            <div className="dropzone-icon">
              {parsing ? (
                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
              ) : (
                <Icon name="Upload" size={24} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                {parsing ? "Extracting text from document..." : "Drag & drop document here, or click to browse"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Supports PDF (.pdf), Word (.docx), or Text (.txt)
              </div>
            </div>
          </div>

          {/* Uploaded File Meta Pill & Preview */}
          {value ? (
            <div style={{ background: "var(--surface-hover)", borderRadius: "var(--radius-md)", padding: 14, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{fileName || "Uploaded Document"}</div>
                    <div style={{ fontSize: 11, color: "var(--olive)", fontWeight: 500 }}>
                      ✓ Document extracted ({value.length.toLocaleString()} chars • {wordCount} words)
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); setMode("paste"); }}
                  >
                    Edit Text
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Replace
                  </button>
                </div>
              </div>

              {/* Text Preview Box */}
              <div
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--text-muted)",
                  background: "var(--surface)",
                  padding: 10,
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  border: "1px solid var(--border)"
                }}
              >
                {value.slice(0, 1200)}
                {value.length > 1200 ? "\n... (remaining text loaded)" : ""}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "8px 0" }}>
              {helpText || "Upload a document to extract full text for ATS scoring and personalized prep."}
            </div>
          )}
        </div>
      ) : (
        <div>
          <textarea
            className="input"
            style={{ minHeight: 300, fontFamily: "inherit", fontSize: 13, lineHeight: 1.6 }}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              {value.length.toLocaleString()} characters • {wordCount} words
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="Upload" size={13} /> Upload file instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Resume & JD ──────────────────────────────────────────────────────────────
function ResumeJD() {
  const { state, refreshState } = React.useContext(Ctx);
  const [resume, setResume] = useState(state.resume?.text || "");
  const [resumeFile, setResumeFile] = useState(state.resume?.filename || "Resume.pdf");
  const [jd, setJd] = useState(state.jd?.text || "");
  const [jdFile, setJdFile] = useState(state.jd?.filename || "Job_Description.docx");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      await api("POST", "/resume", { text: resume, fileName: resumeFile });
      await api("POST", "/jd", { text: jd, fileName: jdFile });
      await refreshState();
      setSaving(false); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message || "Failed to save materials");
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">Materials</div>
        <h1 className="section-title">Resume & Job Description</h1>
        <p className="section-desc">Upload your CV/Resume and Target Job Description documents (PDF, DOCX, TXT) or paste text directly.</p>
      </div>

      {saveError && <div className="alert-error" style={{ marginBottom: 16 }}>{saveError}</div>}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <DocUploaderCard
          title="Resume / CV"
          subtitle="Upload your current resume (.pdf, .docx, or .txt)"
          value={resume}
          onChange={setResume}
          fileName={resumeFile}
          onFileChange={setResumeFile}
          placeholder="Or paste your full resume text here..."
          helpText="Upload your CV/Resume to unlock customized STAR stories, project deep-dive questions, and ATS scoring."
        />

        <DocUploaderCard
          title="Target Job Description"
          subtitle="Upload the target job description (.pdf, .docx, or .txt)"
          value={jd}
          onChange={setJd}
          fileName={jdFile}
          onFileChange={setJdFile}
          placeholder="Or paste the full job description here..."
          helpText="Upload the target JD to unlock skill gap analysis, recruiter interview predictors, and role readiness scoring."
        />
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
          {saving ? "Saving & Syncing with AI…" : saved ? <><Icon name="Check" size={17} />Saved & Synced!</> : <><Icon name="Upload" size={17} />Save & Sync Materials</>}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "var(--olive)", fontWeight: 600 }}>
            ✓ Readiness score and AI questions updated
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Feature page (AI tools) ──────────────────────────────────────────────────
const FEATURE_DESC = {
  "Project Deep-Dive Q&A": "Deep technical questions tailored to your resume projects.",
  "Technical Q&A": "Branch-aware technical questions with answers and follow-ups.",
  "Topic-Wise Revision Notes": "Fast-recall notes, formulas and memory aids from your resume.",
  "AI STAR Story Builder": "Turn your real experiences into concise STAR-format stories.",
  "Tell Me About Yourself": "Generate compelling self-introductions for technical and HR rounds.",
  "HR / Soft Skills": "Practice motivation, teamwork, conflict and situational questions.",
  "JD Predictor": "Predict the exact questions your target company is likely to ask.",
  "Company-Pattern Mock Tests": "Full mock based on the company pattern from the JD.",
  "Interview Round Guide": "Strategy guide for every round with timing and common mistakes.",
  "JD Decoder": "Translate the JD into plain language with hidden expectations exposed.",
  "Role Fit Analyzer": "Compare your work style and evidence against the role requirements.",
  "Resume Gap Analysis": "Find matched, partial and missing requirements from your resume.",
  "Resume ATS Scorer": "Score your resume's ATS friendliness with detailed breakdown.",
  "Salary Negotiation Guide": "Prepare a salary range, counter-offer and evaluation checklist.",
};
const FEATURE_PROMPTS = {
  "Project Deep-Dive Q&A": "Generate 10 deep technical interview questions about each project mentioned in the resume. For each question include a model answer. Format with ## per project.",
  "Technical Q&A": "Generate 15 technical interview questions relevant to the candidate's branch and skills. Include concise model answers. Format as numbered list with bold answers.",
  "Topic-Wise Revision Notes": "Create concise revision notes for each major technical topic in the resume. Include formulas, concepts, and quick memory aids. Use ## headings per topic.",
  "AI STAR Story Builder": "Extract 5 experiences from the resume and convert each into a STAR-format story (Situation, Task, Action, Result). Make them concise and impactful.",
  "Tell Me About Yourself": "Generate three versions of 'Tell me about yourself': 1) For a technical round, 2) For an HR round, 3) A 30-second elevator pitch. Based on the resume and JD.",
  "HR / Soft Skills": "Generate 12 HR interview questions tailored to the role with STAR-framework answer guides. Include: motivation, teamwork, conflict, failure, leadership questions.",
  "JD Predictor": "Analyze the JD and predict the 15 most likely interview questions. Group by: Technical Skills, Behavioral, Role-Specific. Include brief answer strategies.",
  "Company-Pattern Mock Tests": "Based on the JD company, create a realistic mock interview with 5 technical questions, 3 behavioral, 2 case-study/scenario questions. Include evaluation criteria.",
  "Interview Round Guide": "Create a complete interview round guide: round types, duration, what to expect, preparation strategy and common mistakes for each round based on the JD.",
  "JD Decoder": "Decode the JD: extract required skills, nice-to-have skills, hidden cultural clues, red flags, actual day-to-day tasks, and growth opportunities.",
  "Role Fit Analyzer": "Compare the candidate's resume against the JD. Give a fit score, list strong matches, partial matches, and gaps. Suggest 3 talking points to position gaps positively.",
  "Resume Gap Analysis": "Analyze resume vs JD: create a 3-column table of Matched Skills, Partially Met, and Missing. Then prioritize top 5 gaps to address.",
  "Resume ATS Scorer": "Score the resume for ATS compatibility on these dimensions: keyword match, formatting, action verbs, quantification, section clarity. Give a score/10 for each.",
  "Salary Negotiation Guide": "Based on the role in the JD, create a salary negotiation guide: market range, opening ask, counter-offer script, benefits negotiation points, and walk-away criteria.",
};

function FeaturePage({ name }) {
  const { state } = React.useContext(Ctx);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const desc = FEATURE_DESC[name] || "AI-powered personalized preparation.";
  const prompt = FEATURE_PROMPTS[name];

  // Reset state completely when switching tabs
  useEffect(() => {
    setResult(null);
    setError("");
    setLoading(false);
    setCopied(false);
  }, [name]);

  async function generate() {
    if (!state.resume?.text) { setError("Please add your resume in the Resume & JD tab first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await api("POST", "/ai/generate", { prompt: prompt || `Generate interview preparation content for: ${name}` });
      setResult(data.text);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ATS scorer shows structured result
  if (name === "Resume ATS Scorer") return <ATSScorer />;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">AI Tool</div>
        <h1 className="section-title">{name}</h1>
        <p className="section-desc">{desc}</p>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="badge badge-indigo" style={{ marginBottom: 12 }}>Personalized from your materials</div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {state.resume?.text ? `Using your ${state.resume.text.length}-char resume.` : "⚠ No resume added yet."}
              {state.jd?.text ? ` JD loaded (${state.jd.text.length} chars).` : " No JD added."}
            </p>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(140, 98, 57, 0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="Brain" size={24} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Generating…</> : <><Icon name="Zap" size={16} />{result ? "Regenerate" : "Generate"}</>}
          </button>
          {result && (
            <>
              <button className="btn btn-secondary" onClick={copyResult}>
                <Icon name={copied ? "Check" : "FileText"} size={15} />
                {copied ? "Copied!" : "Copy Output"}
              </button>
              <button className="btn btn-secondary" onClick={() => setResult(null)} title="Dismiss generated window">
                <Icon name="X" size={15} />
                Clear Output
              </button>
            </>
          )}
        </div>
        {error && <div className="alert-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>

      {result && <Markdown text={result} />}
    </div>
  );
}

// ─── AI Practice Pack (Standalone Dedicated Page) ────────────────────────────
const PRACTICE_PACK_TOPICS = [
  "Technical Q&A",
  "Project Deep-Dive",
  "HR / Soft Skills",
  "JD Predictor",
];

function PracticePackPage() {
  const { state } = React.useContext(Ctx);
  const [topic, setTopic] = useState("Technical Q&A");
  const [count, setCount] = useState(8);
  const [qs, setQs] = useState([]);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setOpen({});
    try {
      const data = await api("POST", "/questions/generate", { kind: topic, count });
      setQs(Array.isArray(data) ? data : []);
      setHasGenerated(true);
    } catch (e) {
      setError(e.message || "Failed to generate practice pack");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">Practice Module</div>
        <h1 className="section-title">AI Practice Pack</h1>
        <p className="section-desc">
          Generate targeted, high-yield practice interview questions tailored to your profile.
          Practice answering out loud or using the STAR method.
        </p>
      </div>

      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div className="badge badge-indigo" style={{ marginBottom: 10 }}>Personalized Question Generator</div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {state.resume?.text ? `Using your resume (${state.resume.text.length} chars).` : "⚠ Add a resume in Resume & JD for deeper tailored questions."}
              {state.jd?.text ? ` Cross-referencing target JD.` : ""}
            </p>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(140, 98, 57, 0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="Target" size={24} />
          </div>
        </div>

        {/* Topic tabs */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>Select Question Focus:</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PRACTICE_PACK_TOPICS.map(t => (
              <button
                key={t}
                className={`btn btn-sm ${topic === t ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Questions count:</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[5, 8, 10, 15].map(n => (
              <button
                key={n}
                className={`btn btn-sm ${count === n ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "4px 14px", minWidth: 40 }}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? (
            <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Generating {count} Questions…</>
          ) : (
            <><Icon name="Zap" size={16} />{hasGenerated ? "Regenerate Fresh Questions" : `Generate ${count} ${topic} Questions`}</>
          )}
        </button>

        {error && <div className="alert-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>

      {loading && !qs.length && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {qs.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 18 }}>Generated Practice Questions ({qs.length})</h2>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Focus: {topic} · Click each question to reveal answering guidance.</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const allOpen = Object.keys(open).length === qs.length;
              if (allOpen) setOpen({});
              else {
                const o = {};
                qs.forEach((_, i) => o[i] = true);
                setOpen(o);
              }
            }}>
              {Object.keys(open).length === qs.length ? "Collapse All" : "Expand All"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {qs.map((q, i) => (
              <div
                key={i}
                className="q-card"
                style={{
                  cursor: "pointer",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: open[i] ? "var(--surface-2)" : "var(--surface)",
                  transition: "all 0.2s ease"
                }}
                onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "var(--accent-subtle)",
                        color: "var(--accent)",
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      Q{i + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.5, color: "var(--text)" }}>{q}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0, marginTop: 4 }}>
                    {open[i] ? "▲" : "▼"}
                  </span>
                </div>

                {open[i] && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--text-muted)" }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="Brain" size={14} /> Recommended Answering Strategy:
                    </div>
                    <p style={{ lineHeight: 1.6 }}>
                      Use the <strong>STAR Method</strong> (Situation → Task → Action → Result).
                      Ground your answer in real technical decisions, trade-offs, and measurable outcomes from your resume.
                    </p>
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(q);
                        }}
                      >
                        <Icon name="FileText" size={12} /> Copy Question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── ATS Scorer ───────────────────────────────────────────────────────────────
function ATSScorer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true); setError("");
    try { setData(await api("POST", "/ats")); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">AI Tool</div>
        <h1 className="section-title">Resume ATS Scorer</h1>
        <p className="section-desc">Score keyword alignment, structure, verbs and quantification.</p>
      </div>
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? "Scoring…" : <><Icon name="Zap" size={16} />Score my resume</>}
        </button>
        {error && <div className="alert-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>
      {data && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: `conic-gradient(var(--indigo) ${data.score * 3.6}deg, var(--surface-2) 0)`, display: "grid", placeItems: "center" }}>
              <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                <span style={{ fontSize: 22, fontWeight: 900 }}>{data.score}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>ATS Score</div>
              <div style={{ color: "var(--text-muted)" }}>{data.score >= 80 ? "Excellent! Your resume is ATS-ready." : data.score >= 60 ? "Good, some improvements needed." : "Needs work to pass ATS filters."}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {data.checks.map(([label, pass], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, background: pass ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)", border: `1px solid ${pass ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}` }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ color: pass ? "#34d399" : "#fb7185", fontWeight: 700 }}>{pass ? "✓ Pass" : "✗ Fail"}</span>
              </div>
            ))}
          </div>
          {data.tips?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>🤖 AI Improvement Tips</div>
              {data.tips.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", marginBottom: 8 }}>
                  <span style={{ color: "var(--indigo-light)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{tip}</span>
                </div>
              ))}
            </div>
          )}
          {data.keywords?.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Matched keywords</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.keywords.map(k => <span key={k} className="badge badge-indigo">{k}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Aptitude Practice (AI-powered) ───────────────────────────────────────────
const APT_TOPICS = [
  "Mixed (Quantitative, Logical, Verbal)",
  "Number Series & Sequences",
  "Percentages & Profit/Loss",
  "Time, Speed & Distance",
  "Work & Time / Pipes",
  "Probability & Permutations",
  "Logical Reasoning",
  "Data Interpretation",
  "Verbal Reasoning",
  "Blood Relations & Puzzles",
  "Coding-Decoding",
  "Programming & CS Aptitude",
];
const APT_DIFFS  = ["Easy", "Medium", "Hard"];
const APT_COUNTS = [5, 8, 10, 15];

function Aptitude() {
  const [questions, setQuestions] = useState([]);
  const [topic,     setTopic]     = useState(APT_TOPICS[0]);
  const [diff,      setDiff]      = useState("Medium");
  const [count,     setCount]     = useState(8);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  // Quiz state
  const [i,        setI]        = useState(0);
  const [selected, setSelected] = useState(null);
  const [score,    setScore]    = useState(0);
  const [done,     setDone]     = useState(false);
  const [answered, setAnswered] = useState(false);
  const [showExp,  setShowExp]  = useState(false);

  async function generate() {
    setLoading(true); setError("");
    setQuestions([]); setI(0); setScore(0); setDone(false);
    setSelected(null); setAnswered(false); setShowExp(false);
    try {
      const data = await api("POST", "/aptitude/generate", { topic, difficulty: diff, count });
      if (!Array.isArray(data)) throw new Error(data.error || "Invalid response");
      setQuestions(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  // Auto-generate on first load
  useEffect(() => { generate(); }, []);

  function pick(idx) {
    if (answered) return;
    setSelected(idx); setAnswered(true);
    if (idx === questions[i].ans) setScore(s => s + 1);
  }
  function next() {
    if (i >= questions.length - 1) { setDone(true); return; }
    setI(i + 1); setSelected(null); setAnswered(false); setShowExp(false);
  }

  const q   = questions[i];
  const pct = questions.length ? Math.round((i + 1) / questions.length * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">AI-Powered Practice</div>
        <h1 className="section-title">Aptitude Practice</h1>
        <p className="section-desc">Fresh, unique questions generated by AI every time — never the same twice.</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="apt-controls-grid">
          <div className="input-group">
            <label className="input-label">Topic</label>
            <select className="input" value={topic} onChange={e => setTopic(e.target.value)}>
              {APT_TOPICS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Difficulty</label>
            <select className="input" value={diff} onChange={e => setDiff(e.target.value)}>
              {APT_DIFFS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Questions</label>
            <select className="input" value={count} onChange={e => setCount(Number(e.target.value))}>
              {APT_COUNTS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? "…" : <><Icon name="Zap" size={15} />Generate</>}
          </button>
        </div>
        {error && <div className="alert-error" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="card" style={{ padding: 32, maxWidth: 680 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton" style={{ height: 28, width: "70%" }} />
            <div className="skeleton" style={{ height: 60 }} />
            {[1,2,3,4].map(n => <div key={n} className="skeleton" style={{ height: 48 }} />)}
          </div>
          <div style={{ marginTop: 16, color: "var(--text-muted)", fontSize: 14 }}>🤖 AI is generating your {count} {diff} questions on {topic}…</div>
        </div>
      )}

      {/* Quiz */}
      {!loading && questions.length > 0 && (
        <div className="card" style={{ padding: 32, maxWidth: 680 }}>
          {done ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 56 }}>
                {score >= questions.length * 0.8 ? "🏆" : score >= questions.length * 0.5 ? "⭐" : "📚"}
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, marginTop: 16 }}>{score}/{questions.length}</div>
              <div style={{ color: "var(--text-muted)", marginTop: 8 }}>
                {score >= questions.length * 0.8 ? "Excellent! You're well prepared." :
                 score >= questions.length * 0.5 ? "Good effort! Keep practicing." :
                 "Keep going — practice makes perfect!"}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
                <button className="btn btn-primary btn-lg" onClick={() => { setI(0); setScore(0); setDone(false); setSelected(null); setAnswered(false); setShowExp(false); }}>Retry same set</button>
                <button className="btn btn-secondary btn-lg" onClick={generate}>New questions</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span className="badge badge-indigo">Q {i + 1} / {questions.length}</span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className="badge badge-emerald">{score} correct</span>
                  <span className="badge badge-amber">{diff}</span>
                </div>
              </div>
              <div className="progress-bar" style={{ marginBottom: 24 }}>
                <div className="progress-fill progress-indigo" style={{ width: pct + "%" }} />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 24, lineHeight: 1.5 }}>{q.q}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {q.opts.map((opt, idx) => {
                  let cls = "quiz-option";
                  if (answered) {
                    if (idx === q.ans) cls += " correct";
                    else if (idx === selected) cls += " wrong";
                  } else if (idx === selected) cls += " selected";
                  return (
                    <button key={idx} className={cls} onClick={() => pick(idx)}>
                      <span style={{ fontWeight: 700, marginRight: 10, color: "var(--indigo-light)" }}>{"ABCD"[idx]}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <div className="fade-in">
                  {q.explanation && (
                    <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 14, color: "var(--text-muted)" }}>
                      <span style={{ fontWeight: 700, color: "var(--indigo-light)" }}>💡 Explanation: </span>{q.explanation}
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={next}>
                    {i === questions.length - 1 ? "See results" : "Next question"} <Icon name="ArrowRight" size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Voice Interview ──────────────────────────────────────────────────────────
function VoiceInterview({ tab }) {
  const mode = tab.includes("Technical") ? "Technical" : "HR";
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState(
    mode === "Technical"
      ? "Explain one technical project from your resume — its architecture and the challenges you solved."
      : "Tell me about yourself and why you're interested in this role."
  );

  function speak(s) {
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(s)); }
  }
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not available. Use Chrome/Edge or type your answer."); return; }
    const r = new SR(); r.lang = "en-US"; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = e => setText(e.results[0][0].transcript);
    r.start();
  }
  async function submit() {
    if (!text.trim()) return;
    setBusy(true); setFeedback(null);
    const newHistory = [...history, { question: q, answer: text }];
    try {
      const data = await api("POST", "/voice/interview", { mode, answer: text, history: newHistory });
      setFeedback(data);
      setHistory(newHistory);
      setQ(data.nextQuestion);
      setText("");
      setTimeout(() => speak(data.nextQuestion), 800);
    } catch (e) { setFeedback({ error: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">PrepForge AI Interviewer · {mode}</div>
        <h1 className="section-title">Voice Mock Interview</h1>
        <p className="section-desc">A real adaptive AI interviewer. Answer by voice or type — get instant feedback.</p>
      </div>
      <div className="voice-grid">
        {/* Main panel */}
        <div className="card" style={{ padding: 28 }}>
          <div className="badge badge-indigo" style={{ marginBottom: 20 }}>Live session · {mode} mode</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.4, marginBottom: 28, minHeight: 60 }}>{q}</h2>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <button className={`mic-btn ${listening ? "listening" : ""}`} onClick={listen} title="Speak your answer">
              <Icon name="Mic" size={28} />
            </button>
            <div>
              <div style={{ fontWeight: 600 }}>{listening ? "Listening…" : "Click mic to answer by voice"}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Or type below</div>
            </div>
          </div>

          <textarea className="input" style={{ minHeight: 140 }} value={text} onChange={e => setText(e.target.value)}
            placeholder="Your spoken transcript appears here — edit before submitting." />

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => speak(q)}><Icon name="Play" size={15} />Replay question</button>
            <button className="btn btn-primary" onClick={submit} disabled={busy || !text.trim()}>
              {busy ? "Evaluating…" : "Submit answer"}
            </button>
          </div>

          {feedback?.error && <div className="alert-error" style={{ marginTop: 16 }}>{feedback.error}</div>}

          {feedback && !feedback.error && (
            <div className="fade-in" style={{ marginTop: 24 }}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div className="card-glass" style={{ padding: 20, textAlign: "center" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Answer score</div>
                  <div style={{ fontSize: 44, fontWeight: 900, color: feedback.score >= 70 ? "var(--emerald)" : feedback.score >= 50 ? "var(--amber)" : "var(--rose)" }}>{feedback.score}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>out of 100</div>
                </div>
                <div className="card-glass" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Feedback</div>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{feedback.feedback}</p>
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="card-glass" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, color: "#34d399", marginBottom: 8 }}>Strengths</div>
                  {(feedback.strengths || []).map(x => <div key={x} style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>✓ {x}</div>)}
                </div>
                <div className="card-glass" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>Improve</div>
                  {(feedback.improvements || []).map(x => <div key={x} style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>→ {x}</div>)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Interview flow</div>
            {["AI asks a tailored question", "You answer by voice or text", "AI evaluates response in depth", "Adaptive follow-up adapts to your level"].map((x, i) => (
              <div key={x} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "var(--indigo-light)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{x}</div>
              </div>
            ))}
          </div>
          {history.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Session history</div>
              {history.map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>Q{i + 1}: {h.question.slice(0, 60)}…</div>
                  <div>{h.answer.slice(0, 80)}…</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────
function HistoryPage() {
  const { state } = React.useContext(Ctx);
  const history = state.history || [];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">Activity</div>
        <h1 className="section-title">Practice History</h1>
        <p className="section-desc">All your preparation attempts and scores.</p>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        {history.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No history yet</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>Complete a practice session to see results here.</div>
          </div>
        ) : history.map((h, i) => (
          <div key={i} className="history-item">
            <div>
              <div className="history-type">{h.type}</div>
              <div className="history-meta">{new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            {h.score != null && (
              <span className={`badge ${h.score >= 75 ? "badge-emerald" : h.score >= 50 ? "badge-amber" : "badge-rose"}`}>
                {h.score}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Resources ────────────────────────────────────────────────────────────────
const RESOURCES = [
  { title: "JavaScript Fundamentals", desc: "Closures, prototypes, async/await, event loop.", emoji: "⚡" },
  { title: "React Interview Checklist", desc: "Hooks, reconciliation, context, optimization.", emoji: "⚛️" },
  { title: "Node.js & Express", desc: "Middleware, routing, streams, error handling.", emoji: "🟢" },
  { title: "SQL Practice", desc: "Joins, subqueries, indexes, transactions.", emoji: "🗄️" },
  { title: "DSA Patterns", desc: "Two-pointer, sliding window, BFS/DFS, DP.", emoji: "📊" },
  { title: "System Design Basics", desc: "Load balancing, caching, databases, CAP.", emoji: "🏗️" },
  { title: "Git & GitHub", desc: "Branching, merging, rebasing, pull requests.", emoji: "🐙" },
  { title: "REST API Security", desc: "JWT, OAuth, CORS, rate limiting, HTTPS.", emoji: "🔒" },
  { title: "HR Answer Framework", desc: "STAR method, common questions, body language.", emoji: "🤝" },
];

function Resources() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">Free</div>
        <h1 className="section-title">Interview Resources</h1>
        <p className="section-desc">No-paywall resources to strengthen your interview preparation.</p>
      </div>
      <div className="grid-auto">
        {RESOURCES.map(r => (
          <div key={r.title} className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>{r.emoji}</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{r.title}</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPage() {
  const { user, refreshState } = React.useContext(Ctx);
  const [form, setForm] = useState({ name: user.name || "", targetRole: user.target_role || "", branch: user.branch || "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true); setError("");
    try {
      await api("POST", "/profile", form);
      await refreshState();
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="section-eyebrow">Account</div>
        <h1 className="section-title">Settings</h1>
        <p className="section-desc">Manage your PrepForge profile and preferences.</p>
      </div>
      <div className="card" style={{ padding: 28, maxWidth: 520 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20 }}>Profile</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Full name</label>
            <input className="input" value={form.name} onChange={set("name")} />
          </div>
          <div className="input-group">
            <label className="input-label">Email <span style={{ color: "var(--text-dim)" }}>(read-only)</span></label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="input-group">
            <label className="input-label">Target role</label>
            <input className="input" value={form.targetRole} onChange={set("targetRole")} placeholder="e.g. SDE-1, Frontend Engineer" />
          </div>
          <div className="input-group">
            <label className="input-label">Branch / Domain</label>
            <input className="input" value={form.branch} onChange={set("branch")} placeholder="e.g. CSE, IT, ECE" />
          </div>
          {error && <div className="alert-error">{error}</div>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? <><Icon name="Check" size={15} />Saved!</> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dual-Theme UI/UX Showcase ────────────────────────────────────────────────
function DesignShowcase({ theme, toggleTheme, setTab }) {
  const [copiedHex, setCopiedHex] = useState(null);

  function copy(hex) {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="section-eyebrow">Warm Organic Design System</div>
          <h1 className="section-title">Dual-Theme UI/UX Showcase</h1>
          <p className="section-desc">
            A strictly warm, organic, and earthy presentation with absolutely zero blue, purple, violet, or neon colors.
            Side-by-side comparison of <strong>Light Mode (Espresso & Cream)</strong> and <strong>Dark Mode (Rich Walnut / Dark Academia)</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            <Icon name={theme === "light" ? "Moon" : "Sun"} size={16} />
            <span>Switch Current View to {theme === "light" ? "Rich Walnut (Dark)" : "Espresso & Cream (Light)"}</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Presentation */}
      <div className="showcase-container">
        {/* Left Side: Light Mode (Espresso & Cream) */}
        <div className="showcase-half light-side">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(140, 98, 57, 0.2)", paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8C6239" }}>Theme Showcase</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1C120C", margin: "2px 0 0" }}>Light Mode · Espresso & Cream</h2>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(140, 98, 57, 0.12)", color: "#8C6239" }}>
              #FBF9F6 Canvas
            </span>
          </div>

          {/* Mini Dashboard Frame */}
          <div style={{ background: "#F3EFEA", borderRadius: 14, padding: 20, border: "1px solid rgba(140, 98, 57, 0.2)", boxShadow: "0 2px 12px rgba(28,18,12,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#8C6239", color: "#FFF", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800 }}>✦</div>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#1C120C" }}>PrepForge Dashboard</span>
              </div>
              <button style={{ background: "#8C6239", color: "#FFFFFF", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Primary CTA
              </button>
            </div>

            {/* Metric Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "#FBF9F6", padding: 12, borderRadius: 10, border: "1px solid rgba(140, 98, 57, 0.16)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#5C4E43", textTransform: "uppercase" }}>Readiness</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#1C120C", marginTop: 2 }}>92%</div>
                <div style={{ fontSize: 11, color: "#58644A", fontWeight: 600 }}>+4.5% vs average</div>
              </div>
              <div style={{ background: "#FBF9F6", padding: 12, borderRadius: 10, border: "1px solid rgba(140, 98, 57, 0.16)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#5C4E43", textTransform: "uppercase" }}>AI Accuracy</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#1C120C", marginTop: 2 }}>98.4%</div>
                <div style={{ fontSize: 11, color: "#8C6239", fontWeight: 600 }}>Zero halluncinations</div>
              </div>
              <div style={{ background: "#FBF9F6", padding: 12, borderRadius: 10, border: "1px solid rgba(140, 98, 57, 0.16)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#5C4E43", textTransform: "uppercase" }}>Interview Turns</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#1C120C", marginTop: 2 }}>24</div>
                <div style={{ fontSize: 11, color: "#5C4E43" }}>Across 3 sessions</div>
              </div>
            </div>

            {/* Organic SVG Chart */}
            <div style={{ background: "#FBF9F6", padding: 14, borderRadius: 10, border: "1px solid rgba(140, 98, 57, 0.16)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1C120C", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span>Skill Progression & Velocity</span>
                <span style={{ color: "#8C6239", fontWeight: 600, fontSize: 11 }}>Weekly Trajectory</span>
              </div>
              <svg width="100%" height="70" viewBox="0 0 320 70" fill="none">
                <path d="M 0 55 Q 50 40 90 48 T 180 25 T 260 30 T 320 10 L 320 70 L 0 70 Z" fill="rgba(140, 98, 57, 0.12)" />
                <path d="M 0 55 Q 50 40 90 48 T 180 25 T 260 30 T 320 10" stroke="#8C6239" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="180" cy="25" r="4" fill="#8C6239" />
                <circle cx="320" cy="10" r="4" fill="#8C6239" />
              </svg>
            </div>
          </div>

          {/* Palette Spec Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F3EFEA", borderRadius: 8, border: "1px solid rgba(140, 98, 57, 0.2)", cursor: "pointer" }} onClick={() => copy("#FBF9F6")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#FBF9F6", border: "1px solid #EAE3DA" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1C120C" }}>Canvas Background</div>
                <code style={{ fontSize: 11, color: "#5C4E43" }}>#FBF9F6</code>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F3EFEA", borderRadius: 8, border: "1px solid rgba(140, 98, 57, 0.2)", cursor: "pointer" }} onClick={() => copy("#F3EFEA")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#F3EFEA", border: "1px solid #D8CFC4" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1C120C" }}>Surface Container</div>
                <code style={{ fontSize: 11, color: "#5C4E43" }}>#F3EFEA</code>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F3EFEA", borderRadius: 8, border: "1px solid rgba(140, 98, 57, 0.2)", cursor: "pointer" }} onClick={() => copy("#1C120C")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#1C120C" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1C120C" }}>Deep Espresso Text</div>
                <code style={{ fontSize: 11, color: "#5C4E43" }}>#1C120C</code>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F3EFEA", borderRadius: 8, border: "1px solid rgba(140, 98, 57, 0.2)", cursor: "pointer" }} onClick={() => copy("#8C6239")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#8C6239" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1C120C" }}>Interactive CTA</div>
                <code style={{ fontSize: 11, color: "#5C4E43" }}>#8C6239</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Dark Mode (Rich Walnut / Dark Academia) */}
        <div className="showcase-half dark-side">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(212, 163, 115, 0.2)", paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#D4A373" }}>Theme Showcase</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#F5EFE6", margin: "2px 0 0" }}>Dark Mode · Rich Walnut</h2>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(212, 163, 115, 0.14)", color: "#D4A373" }}>
              #141210 Canvas
            </span>
          </div>

          {/* Mini Dashboard Frame */}
          <div style={{ background: "#1C1916", borderRadius: 14, padding: 20, border: "1px solid rgba(212, 163, 115, 0.22)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#D4A373", color: "#141210", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 900 }}>✦</div>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#F5EFE6" }}>PrepForge Dashboard</span>
              </div>
              <button style={{ background: "#D4A373", color: "#141210", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                + Primary CTA
              </button>
            </div>

            {/* Metric Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "#24201C", padding: 12, borderRadius: 10, border: "1px solid rgba(212, 163, 115, 0.16)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#B8AF9F", textTransform: "uppercase" }}>Readiness</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#F5EFE6", marginTop: 2 }}>92%</div>
                <div style={{ fontSize: 11, color: "#A5A58D", fontWeight: 600 }}>+4.5% vs average</div>
              </div>
              <div style={{ background: "#24201C", padding: 12, borderRadius: 10, border: "1px solid rgba(212, 163, 115, 0.16)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#B8AF9F", textTransform: "uppercase" }}>AI Accuracy</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#F5EFE6", marginTop: 2 }}>98.4%</div>
                <div style={{ fontSize: 11, color: "#D4A373", fontWeight: 600 }}>Zero hallucinations</div>
              </div>
              <div style={{ background: "#24201C", padding: 12, borderRadius: 10, border: "1px solid rgba(212, 163, 115, 0.16)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#B8AF9F", textTransform: "uppercase" }}>Interview Turns</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#F5EFE6", marginTop: 2 }}>24</div>
                <div style={{ fontSize: 11, color: "#7A7264" }}>Across 3 sessions</div>
              </div>
            </div>

            {/* Organic SVG Chart */}
            <div style={{ background: "#24201C", padding: 14, borderRadius: 10, border: "1px solid rgba(212, 163, 115, 0.16)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F5EFE6", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span>Skill Progression & Velocity</span>
                <span style={{ color: "#D4A373", fontWeight: 600, fontSize: 11 }}>Weekly Trajectory</span>
              </div>
              <svg width="100%" height="70" viewBox="0 0 320 70" fill="none">
                <path d="M 0 55 Q 50 40 90 48 T 180 25 T 260 30 T 320 10 L 320 70 L 0 70 Z" fill="rgba(212, 163, 115, 0.12)" />
                <path d="M 0 55 Q 50 40 90 48 T 180 25 T 260 30 T 320 10" stroke="#D4A373" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="180" cy="25" r="4" fill="#D4A373" />
                <circle cx="320" cy="10" r="4" fill="#D4A373" />
              </svg>
            </div>
          </div>

          {/* Palette Spec Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1C1916", borderRadius: 8, border: "1px solid rgba(212, 163, 115, 0.2)", cursor: "pointer" }} onClick={() => copy("#141210")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#141210", border: "1px solid #24201C" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F5EFE6" }}>Canvas Background</div>
                <code style={{ fontSize: 11, color: "#B8AF9F" }}>#141210</code>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1C1916", borderRadius: 8, border: "1px solid rgba(212, 163, 115, 0.2)", cursor: "pointer" }} onClick={() => copy("#1C1916")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#1C1916", border: "1px solid #2E2924" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F5EFE6" }}>Elevated Surface</div>
                <code style={{ fontSize: 11, color: "#B8AF9F" }}>#1C1916</code>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1C1916", borderRadius: 8, border: "1px solid rgba(212, 163, 115, 0.2)", cursor: "pointer" }} onClick={() => copy("#F5EFE6")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#F5EFE6" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F5EFE6" }}>Soft Ivory Text</div>
                <code style={{ fontSize: 11, color: "#B8AF9F" }}>#F5EFE6</code>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#1C1916", borderRadius: 8, border: "1px solid rgba(212, 163, 115, 0.2)", cursor: "pointer" }} onClick={() => copy("#D4A373")}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#D4A373" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F5EFE6" }}>Interactive Accent</div>
                <code style={{ fontSize: 11, color: "#B8AF9F" }}>#D4A373</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {copiedHex && (
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
          Copied {copiedHex} to clipboard!
        </div>
      )}
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")).render(<App />);
