import "dotenv/config";
import cors from "cors";
import express from "express";
import { AuthedRequest, requireAuth, requireRole } from "./app/auth/middleware.js";
import { createInMemorySessionStore } from "./app/auth/sessionStore.js";
import { toPublicUser, UserRole } from "./app/auth/types.js";
import { createMockUserRepository } from "./app/auth/userRepository.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Temporary adapters for milestone development before real DB/session providers.
const userRepo = createMockUserRepository();
const sessionStore = createInMemorySessionStore();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.type("text").send(
    "Classroom API — this is the backend only.\nUse GET /health or call it from the client app.\n"
  );
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Register endpoint (mock storage for now).
app.post("/auth/register", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const roleInput = req.body?.role;
  const role: UserRole = roleInput === "admin" ? "admin" : "user";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const createdUser = await userRepo.create({ email, password, role });
    const token = sessionStore.issueToken(createdUser.id);
    res.status(201).json({ token, user: toPublicUser(createdUser) });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      res.status(409).json({ error: "Email already exists." });
      return;
    }

    res.status(500).json({ error: "Could not register user." });
  }
});

// Login endpoint returns bearer token and user profile.
app.post("/auth/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await userRepo.findByEmail(email);
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const token = sessionStore.issueToken(user.id);
  res.json({ token, user: toPublicUser(user) });
});

// Protected endpoint to resolve current authenticated user.
app.get("/auth/me", requireAuth(userRepo, sessionStore), (req, res) => {
  const authReq = req as AuthedRequest;
  res.json({ user: toPublicUser(authReq.authUser!) });
});

// Admin-only endpoint for usage monitoring table in client dashboard.
app.get(
  "/admin/usage",
  requireAuth(userRepo, sessionStore),
  requireRole("admin"),
  async (_req, res) => {
    const users = await userRepo.listAll();
    res.json({ users: users.map(toPublicUser) });
  }
);

// Debug-only helper to view available mock credentials in development.
app.get("/auth/mock-credentials", async (_req, res) => {
  const users = await userRepo.listAll();
  res.json({
    note: "Mock-only endpoint for local testing. Remove when real DB auth is ready.",
    users: users.map((user) => ({
      email: user.email,
      password: user.password,
      role: user.role,
    })),
  });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
