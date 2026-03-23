import { Router } from "express";
import { body, validationResult } from "express-validator";
import db from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { trackApiCall } from "../middleware/apiLimit.js";
import { gradeSubmission } from "../services/ai.js";

const router = Router();

/** POST /assignments/:id/submit — student submits answers for AI grading */
router.post(
  "/assignments/:id/submit",
  requireAuth,
  trackApiCall,
  body("answers").isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const assignment = db
      .prepare("SELECT id, questions, rubric FROM assignments WHERE id = ?")
      .get(req.params.id) as { id: number; questions: string; rubric: string } | undefined;

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    const questions: string[] = JSON.parse(assignment.questions);
    const { answers } = req.body as { answers: string[] };

    if (answers.length !== questions.length) {
      res.status(400).json({
        error: `Expected ${questions.length} answers, got ${answers.length}`,
      });
      return;
    }

    // Insert submission first (ungraded)
    const result = db
      .prepare(
        "INSERT INTO submissions (assignment_id, student_id, answers) VALUES (?, ?, ?)"
      )
      .run(assignment.id, req.user!.userId, JSON.stringify(answers));

    const submissionId = result.lastInsertRowid as number;

    // Grade with AI
    try {
      const grade = await gradeSubmission(questions, answers, assignment.rubric);

      db.prepare(
        "UPDATE submissions SET ai_score = ?, ai_feedback = ?, graded_at = datetime('now') WHERE id = ?"
      ).run(grade.score, grade.feedback, submissionId);

      res.status(201).json({
        id: submissionId,
        score: grade.score,
        feedback: grade.feedback,
        warning: (req as any).apiLimitWarning,
      });
    } catch (err: any) {
      // Submission saved but grading failed
      res.status(201).json({
        id: submissionId,
        score: null,
        feedback: null,
        grading_error: err.message || "AI grading failed",
        warning: (req as any).apiLimitWarning,
      });
    }
  }
);

/** GET /submissions — list own submissions (or all for instructor/admin) */
router.get("/submissions", requireAuth, (req, res) => {
  let rows;

  if (req.user!.role === "student") {
    rows = db
      .prepare(
        `SELECT s.id, s.assignment_id, a.title AS assignment_title,
                s.ai_score, s.ai_feedback, s.graded_at, s.created_at
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         WHERE s.student_id = ?
         ORDER BY s.created_at DESC`
      )
      .all(req.user!.userId);
  } else {
    rows = db
      .prepare(
        `SELECT s.id, s.assignment_id, a.title AS assignment_title,
                s.student_id, u.email AS student_email,
                s.ai_score, s.ai_feedback, s.graded_at, s.created_at
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         ORDER BY s.created_at DESC`
      )
      .all();
  }

  res.json(rows);
});

/** GET /submissions/:id */
router.get("/submissions/:id", requireAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT s.*, a.title AS assignment_title, a.questions,
              u.email AS student_email
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN users u ON u.id = s.student_id
       WHERE s.id = ?`
    )
    .get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  // Students can only view their own
  if (req.user!.role === "student" && row.student_id !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  row.questions = JSON.parse(row.questions);
  row.answers = JSON.parse(row.answers);
  res.json(row);
});

export default router;
