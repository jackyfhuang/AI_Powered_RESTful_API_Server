import "dotenv/config";
import cors from "cors";
import express from "express";

// Initialize DB tables + seed test users
import "./db/schema.js";
import "./db/seed.js";

// Route modules
import authRoutes from "./routes/auth.js";
import assignmentRoutes from "./routes/assignments.js";
import submissionRoutes from "./routes/submissions.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// --- Routes ---
app.use("/auth", authRoutes);
app.use("/assignments", assignmentRoutes);
app.use("/", submissionRoutes);       // /assignments/:id/submit, /submissions, /submissions/:id
app.use("/admin", adminRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
