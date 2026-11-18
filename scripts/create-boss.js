import { input } from "@inquirer/prompts";
import password from "@inquirer/password";
import argon2 from "argon2";
import pg from "pg";

const { Pool } = pg;

const email = (process.env.BOSS_EMAIL || await input({ message: "Boss email:" }))
  .trim()
  .toLowerCase();
const bossPassword = process.env.BOSS_PASSWORD || await password({
  message: "Boss password:",
  mask: true
});
const confirmation = process.env.BOSS_PASSWORD || await password({
  message: "Repeat boss password:",
  mask: true
});

if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Invalid email");
if (bossPassword.length < 12) throw new Error("Password must be at least 12 characters");
if (bossPassword !== confirmation) throw new Error("Passwords do not match");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const existing = await client.query(
    "SELECT 1 FROM users WHERE email = $1 FOR UPDATE",
    [email]
  );
  if (existing.rowCount) throw new Error("User already exists; no changes made");

  const passwordHash = await argon2.hash(bossPassword, { type: argon2.argon2id });
  const result = await client.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'boss')
     RETURNING id, email, role`,
    [email, passwordHash]
  );
  await client.query("COMMIT");
  console.log("Boss account created:", result.rows[0]);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
