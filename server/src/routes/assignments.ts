import { Router } from "express";
import { body, validationResult } from "express-validator";
import db from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/** POST /assignments — create (instructor/admin) */
router.post(
  "/",
  requireAuth,
  requireRole("instructor", "admin"),
  body("title").trim().notEmpty().escape(),
  body("questions").isArray({ min: 1 }),
  body("rubric").trim().notEmpty().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { title, questions, rubric } = req.body;

    const result = db
      .prepare(
        "INSERT INTO assignments (instructor_id, title, questions, rubric) VALUES (?, ?, ?, ?)"
      )
      .run(req.user!.userId, title, JSON.stringify(questions), rubric);

    res.status(201).json({ id: result.lastInsertRowid, title });
  }
);

/** GET /assignments — list all */
router.get("/", requireAuth, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.questions, a.rubric, a.created_at,
              u.email AS instructor_email
       FROM assignments a
       JOIN users u ON u.id = a.instructor_id
       ORDER BY a.created_at DESC`
    )
    .all();

  const assignments = (rows as any[]).map((r) => ({
    ...r,
    questions: JSON.parse(r.questions),
  }));

  res.json(assignments);
});

/** GET /assignments/:id */
router.get("/:id", requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT a.id, a.title, a.questions, a.rubric, a.created_at,
              u.email AS instructor_email
       FROM assignments a
       JOIN users u ON u.id = a.instructor_id
       WHERE a.id = ?`
    )
    .get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  row.questions = JSON.parse(row.questions);
  res.json(row);
});

/** PUT /assignments/:id — update (owner or admin) */
router.put(
  "/:id",
  requireAuth,
  requireRole("instructor", "admin"),
  body("title").optional().trim().notEmpty().escape(),
  body("questions").optional().isArray({ min: 1 }),
  body("rubric").optional().trim().notEmpty().escape(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const existing = db
      .prepare("SELECT instructor_id FROM assignments WHERE id = ?")
      .get(req.params.id) as { instructor_id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    if (existing.instructor_id !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { title, questions, rubric } = req.body;

    db.prepare(
      `UPDATE assignments
       SET title = COALESCE(?, title),
           questions = COALESCE(?, questions),
           rubric = COALESCE(?, rubric)
       WHERE id = ?`
    ).run(
      title ?? null,
      questions ? JSON.stringify(questions) : null,
      rubric ?? null,
      req.params.id
    );

    res.json({ message: "Updated" });
  }
);

/** DELETE /assignments/:id */
router.delete(
  "/:id",
  requireAuth,
  requireRole("instructor", "admin"),
  (req, res) => {
    const existing = db
      .prepare("SELECT instructor_id FROM assignments WHERE id = ?")
      .get(req.params.id) as { instructor_id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    if (existing.instructor_id !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    db.prepare("DELETE FROM assignments WHERE id = ?").run(req.params.id);
    res.json({ message: "Deleted" });
  }
);

export default router;
