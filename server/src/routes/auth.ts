import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import db from "../db/schema.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;

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

    res.status(201).json({
      token,
      user: toClientUser({
        id: result.lastInsertRowid as number,
        email,
        role: role || "student",
        api_calls_used: 0,
      }),
    });
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
    .prepare("SELECT id, email, password_hash, role, api_calls_used FROM users WHERE email = ?")
    .get(email) as
    | {
        id: number;
        email: string;
        password_hash: string;
        role: string;
        api_calls_used: number;
      }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ token, user: toClientUser(user) });
});

/** GET /auth/me */
router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, email, role, api_calls_used FROM users WHERE id = ?")
    .get(req.user!.userId) as
    | {
        id: number;
        email: string;
        role: string;
        api_calls_used: number;
      }
    | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: toClientUser(user) });
});

export default router;
