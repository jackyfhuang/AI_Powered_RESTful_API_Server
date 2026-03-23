import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "..", "data.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'student' CHECK(role IN ('student','instructor','admin')),
    api_calls_used INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instructor_id INTEGER NOT NULL REFERENCES users(id),
    title         TEXT    NOT NULL,
    questions     TEXT    NOT NULL,  -- JSON array of question strings
    rubric        TEXT    NOT NULL,  -- grading rubric / criteria
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id),
    student_id    INTEGER NOT NULL REFERENCES users(id),
    answers       TEXT    NOT NULL,  -- JSON array of answer strings
    ai_score      REAL,
    ai_feedback   TEXT,              -- JSON or plain text feedback from AI
    graded_at     TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
