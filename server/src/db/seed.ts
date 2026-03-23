import db from "./schema.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function seed() {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@admin.com");
  if (existing) return; // already seeded

  const insert = db.prepare(
    "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)"
  );

  insert", bcrypt.hashSync("111", SALT_ROUNDS), "admin");
  insert.run("john@john.com", bcrypt.hashSync("123", SALT_ROUNDS), "student");

  console.log("Seeded test users: admin@admin.com (admin) and john@john.com (student)");
}

seed();
