import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import db from "../db/schema.js";
import { signToken } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;

// Shared validation
const emailVal = body("email").isEmail().normalizeEmail();
const passVal = body("password").isLength({ min: 1 }).trim().escape();

/** POST /auth/register */
router.post(
  "/register",
  emailVal,
  passVal,
  body("role").optional().isIn(["student", "instructor"]),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, role } = req.body;

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    const result = db
      .prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)")
      .run(email, hash, role || "student");

    const token = signToken({
      userId: result.lastInsertRowid as number,
      email,
      role: role || "student",
    });

    res.status(201).json({ token, role: role || "student" });
  }
);

/** POST /auth/login */
router.post("/login", emailVal, passVal, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  const user = db
    .prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?")
    .get(email) as { id: number; email: string; password_hash: string; role: string } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, role: user.role });
});

export default router;
