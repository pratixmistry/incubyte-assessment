import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { USD_PER_UNIT } from '../domain/currency.js';
import { COUNTRIES } from '../domain/reference.js';

export type Database = DatabaseSync;

const SCHEMA = /* sql */ `
  CREATE TABLE IF NOT EXISTS currencies (
    code      TEXT PRIMARY KEY,
    usd_rate  REAL NOT NULL CHECK (usd_rate > 0)
  );

  CREATE TABLE IF NOT EXISTS countries (
    code           TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    currency_code  TEXT NOT NULL REFERENCES currencies(code)
  );

  CREATE TABLE IF NOT EXISTS employees (
    id            INTEGER PRIMARY KEY,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    job_title     TEXT NOT NULL,
    department    TEXT NOT NULL,
    country_code  TEXT NOT NULL REFERENCES countries(code),
    salary        INTEGER NOT NULL CHECK (salary > 0), -- annual, whole units of the country's currency
    hire_date     TEXT NOT NULL,                       -- YYYY-MM-DD
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_employees_country    ON employees(country_code);
  CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
  CREATE INDEX IF NOT EXISTS idx_employees_job_title  ON employees(job_title);
  CREATE INDEX IF NOT EXISTS idx_employees_full_name  ON employees(full_name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS salary_changes (
    id               INTEGER PRIMARY KEY,
    employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    previous_salary  INTEGER,          -- NULL for the starting salary
    new_salary       INTEGER NOT NULL,
    currency_code    TEXT NOT NULL,    -- captured at change time; survives a country move
    effective_date   TEXT NOT NULL     -- YYYY-MM-DD
  );

  CREATE INDEX IF NOT EXISTS idx_salary_changes_employee ON salary_changes(employee_id, effective_date);
`;

/**
 * Opens (and migrates) a database. Use ':memory:' for tests.
 *
 * node:sqlite is built into Node >= 22.13, so there is no native module to
 * compile on install/deploy. All SQL lives behind repositories, so swapping
 * the driver (better-sqlite3) or engine (Postgres) is contained.
 */
export function openDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  db.exec(SCHEMA);
  // Reference data is owned by code; upsert it so rate/country changes roll out on deploy.
  withTransaction(db, () => {
    const upsertCurrency = db.prepare(
      'INSERT INTO currencies (code, usd_rate) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET usd_rate = excluded.usd_rate',
    );
    for (const [code, rate] of Object.entries(USD_PER_UNIT)) upsertCurrency.run(code, rate);

    const upsertCountry = db.prepare(
      `INSERT INTO countries (code, name, currency_code) VALUES (?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET name = excluded.name, currency_code = excluded.currency_code`,
    );
    for (const c of COUNTRIES) upsertCountry.run(c.code, c.name, c.currency);
  });
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export function withTransaction<T>(db: Database, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
