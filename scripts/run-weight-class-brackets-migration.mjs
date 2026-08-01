import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const sql = readFileSync(
  join(process.cwd(), "migrations", "20260731_tournament_weight_class_brackets.sql"),
  "utf8",
);

try {
  await pool.query(sql);
  const cols = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE (table_name = 'pro_tournaments' AND column_name IN ('entry_type', 'class_champions_json'))
       OR (table_name = 'pro_tournament_fixtures' AND column_name IN ('weight_class', 'home_user_id', 'away_user_id'))
    ORDER BY table_name, column_name
  `);
  const table = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'pro_tournament_entrants'
    ) AS entrants_exists
  `);
  console.log("columns:", cols.rows);
  console.log("entrants_table:", table.rows[0]);
  console.log("migration ok");
} finally {
  await pool.end();
}
