import { Router } from "express";
import db from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

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
