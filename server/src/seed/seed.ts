/**
 * CLI: `npm run seed` — (re)creates the database with 10,000 employees.
 * Env: DB_PATH (default ./data/salary.db), SEED_COUNT (default 10000).
 */
import { config } from '../config.js';
import { openDatabase } from '../db/database.js';
import { generateEmployees } from './generator.js';
import { countEmployees, seedDatabase } from './seeder.js';

const count = Number(process.env.SEED_COUNT ?? 10_000);
const started = performance.now();

const db = openDatabase(config.dbPath);
seedDatabase(db, generateEmployees({ count }));

console.log(
  `Seeded ${countEmployees(db).toLocaleString()} employees into ${config.dbPath} in ${Math.round(performance.now() - started)} ms`,
);
db.close();
