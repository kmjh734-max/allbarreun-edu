/**
 * Apply vocab + question-generator migrations (015–034).
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/apply-vocab-qg-migrations.mjs
 * or set SUPABASE_DB_PASSWORD + project ref defaults.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "APPLY_015_TO_034_vocab_qg.sql");

function loadEnvLocal() {
  const p = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      })
  );
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  let connectionString = env.DATABASE_URL || env.SUPABASE_DB_URL;
  if (!connectionString && env.SUPABASE_DB_PASSWORD) {
    const ref =
      env.SUPABASE_PROJECT_REF ||
      (env.NEXT_PUBLIC_SUPABASE_URL || "")
        .replace("https://", "")
        .replace(".supabase.co", "");
    const region = env.SUPABASE_POOLER_REGION || "ap-northeast-2";
    const aws = env.SUPABASE_POOLER_AWS || "aws-1";
    const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
    connectionString = `postgresql://postgres.${ref}:${password}@${aws}-${region}.pooler.supabase.com:6543/postgres`;
  }
  if (!connectionString) {
    console.error(
      "Set DATABASE_URL or SUPABASE_DB_PASSWORD to apply migrations."
    );
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected. Applying", sqlPath);
  await client.query(sql);
  console.log("Done.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
