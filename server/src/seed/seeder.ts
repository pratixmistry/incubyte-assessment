import { type Database, withTransaction } from '../db/database.js';
import { findCountry } from '../domain/reference.js';
import type { SeedEmployee } from './generator.js';

/**
 * Replaces all employee data with `employees` in a single transaction using
 * prepared statements (10k employees + history insert in well under a second).
 */
export function seedDatabase(db: Database, employees: readonly SeedEmployee[], now = new Date().toISOString()): void {
  withTransaction(db, () => {
    db.exec('DELETE FROM salary_changes; DELETE FROM employees;');

    const insertEmployee = db.prepare(
      `INSERT INTO employees (full_name, email, job_title, department, country_code, salary, hire_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertChange = db.prepare(
      `INSERT INTO salary_changes (employee_id, previous_salary, new_salary, currency_code, effective_date)
       VALUES (?, ?, ?, ?, ?)`,
    );

    for (const e of employees) {
      const { lastInsertRowid } = insertEmployee.run(
        e.fullName, e.email, e.jobTitle, e.department, e.countryCode, e.salary, e.hireDate, now, now,
      );
      const currency = findCountry(e.countryCode)!.currency;
      for (const change of e.salaryHistory) {
        insertChange.run(lastInsertRowid, change.previousSalary, change.newSalary, currency, change.effectiveDate);
      }
    }
  });
}

export function countEmployees(db: Database): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM employees').get() as { n: number };
  return row.n;
}
