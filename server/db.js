import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "prepforge.db"));

// Enable WAL for performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    target_role TEXT    DEFAULT '',
    branch      TEXT    DEFAULT '',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT    DEFAULT '',
    file_name  TEXT    DEFAULT '',
    updated_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jd (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT    DEFAULT '',
    updated_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL,
    score      INTEGER,
    meta       TEXT    DEFAULT '{}',
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

// ── Prepared statements ───────────────────────────────────────────────────────
export const stmt = {
  // users
  createUser: db.prepare(
    "INSERT INTO users (name, email, password, target_role, branch) VALUES (?,?,?,?,?)"
  ),
  getUserByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  getUserById:    db.prepare("SELECT * FROM users WHERE id = ?"),
  updateProfile:  db.prepare(
    "UPDATE users SET name=?, target_role=?, branch=? WHERE id=?"
  ),

  // resume – upsert via INSERT OR REPLACE (user_id is UNIQUE)
  getResume:    db.prepare("SELECT * FROM resumes WHERE user_id = ?"),
  ensureResume: db.prepare("INSERT OR IGNORE INTO resumes (user_id) VALUES (?)"),
  updateResume: db.prepare(
    "UPDATE resumes SET text=?, file_name=?, updated_at=datetime('now') WHERE user_id=?"
  ),

  // jd
  getJd:    db.prepare("SELECT * FROM jd WHERE user_id = ?"),
  ensureJd: db.prepare("INSERT OR IGNORE INTO jd (user_id) VALUES (?)"),
  updateJd: db.prepare(
    "UPDATE jd SET text=?, updated_at=datetime('now') WHERE user_id=?"
  ),

  // history
  addHistory:  db.prepare(
    "INSERT INTO history (user_id, type, score, meta) VALUES (?,?,?,?)"
  ),
  getHistory:  db.prepare(
    "SELECT * FROM history WHERE user_id=? ORDER BY created_at DESC LIMIT 50"
  ),
};

// Ensure resume/jd rows exist for a user
export function ensureUserData(userId) {
  stmt.ensureResume.run(userId);
  stmt.ensureJd.run(userId);
}

// ── Seed Demo Accounts ────────────────────────────────────────────────────────
try {
  import("bcryptjs").then(({ default: bcrypt }) => {
    const demoUsers = [
      { email: "demo@prepforge.com", name: "Demo Candidate", role: "Software Engineer", branch: "CSE" },
      { email: "test@demo.com", name: "Test User", role: "Frontend Developer", branch: "IT" }
    ];
    
    bcrypt.hash("password123", 10).then(hashed => {
      for (const u of demoUsers) {
        const found = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
        if (!found) {
          const res = db.prepare(
            "INSERT INTO users (name, email, password, target_role, branch) VALUES (?,?,?,?,?)"
          ).run(u.name, u.email, hashed, u.role, u.branch);
          
          db.prepare("INSERT OR IGNORE INTO resumes (user_id, text, file_name) VALUES (?,?,?)").run(
            res.lastInsertRowid,
            "Full-Stack Developer with 2+ years of experience in React, Node.js, Express, PostgreSQL, REST APIs, and Cloud Architecture. Built real-time collaborative applications, optimized database query performance by 40%, and implemented secure JWT-based authentication systems.",
            "Resume.pdf"
          );
          db.prepare("INSERT OR IGNORE INTO jd (user_id, text) VALUES (?,?)").run(
            res.lastInsertRowid,
            "Senior Frontend / Full-Stack Engineer. Required: React, Node.js, TypeScript, RESTful APIs, System Design. Nice to have: Docker, CI/CD, Cloud Deployment, Performance Optimization."
          );
        }
      }
    }).catch(() => {});
  });
} catch {}

export default db;
