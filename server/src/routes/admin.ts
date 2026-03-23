import { Router } from "express";
import db from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function toClientRole(role: string): "user" | "admin" {
  return role === "admin" ? "admin" : "user";
}

function toClientUser(user: {
  id: number;
  email: string;
  role: string;
  api_calls_used?: number;
}) {
  return {
    id: user.id,
    email: user.email,
    role: toClientRole(user.role),
    apiCallsUsed: user.api_calls_used ?? 0,
  };
}

/** GET /admin/usage — Day 3 admin usage table contract */
router.get(
  "/usage",
  requireAuth,
  requireRole("admin"),
  (_req, res) => {
    const rows = db
      .prepare(
        `SELECT id, email, role, api_calls_used
         FROM users
         ORDER BY id ASC`
      )
      .all() as Array<{ id: number; email: string; role: string; api_calls_used: number }>;

    res.json({ users: rows.map(toClientUser) });
  }
);

/** GET /admin/users — list all users with API usage */
router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  (_req, res) => {
    const rows = db
      .prepare(
        `SELECT id, email, role, api_calls_used, created_at
         FROM users
         ORDER BY created_at DESC`
      )
      .all();

    res.json(rows);
  }
);

/** GET /admin/stats — system-wide statistics */
router.get(
  "/stats",
  requireAuth,
  requireRole("admin"),
  (_req, res) => {
    const userCount = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as any).c;
    const assignmentCount = (db.prepare("SELECT COUNT(*) AS c FROM assignments").get() as any).c;
    const submissionCount = (db.prepare("SELECT COUNT(*) AS c FROM submissions").get() as any).c;
    const totalApiCalls = (
      db.prepare("SELECT COALESCE(SUM(api_calls_used),0) AS c FROM users").get() as any
    ).c;

    res.json({
      users: userCount,
      assignments: assignmentCount,
      submissions: submissionCount,
      total_api_calls: totalApiCalls,
    });
  }
);

export default router;
