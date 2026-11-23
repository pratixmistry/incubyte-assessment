import type { SQLInputValue } from 'node:sqlite';
import type { Database } from '../db/database.js';
import type { Employee, EmployeeInput, EmployeeListQuery, Page, SalaryChange, SortField } from '../domain/employee.js';

interface EmployeeRow {
  id: number;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  salary: number;
  salary_usd: number;
  hire_date: string;
  created_at: string;
  updated_at: string;
}

interface SalaryChangeRow {
  id: number;
  previous_salary: number | null;
  new_salary: number;
  currency_code: string;
  effective_date: string;
}

const SELECT_EMPLOYEE = /* sql */ `
  SELECT e.id, e.full_name, e.email, e.job_title, e.department, e.country_code,
         c.name AS country_name, c.currency_code, e.salary,
         CAST(ROUND(e.salary * cur.usd_rate) AS INTEGER) AS salary_usd,
         e.hire_date, e.created_at, e.updated_at
  FROM employees e
  JOIN countries c    ON c.code = e.country_code
  JOIN currencies cur ON cur.code = c.currency_code
`;

/** Whitelisted ORDER BY expressions — never interpolate user input into SQL. */
const ORDER_BY: Record<SortField, string> = {
  name: 'e.full_name COLLATE NOCASE',
  salary: 'salary_usd', // compare across currencies on a common basis
  hireDate: 'e.hire_date',
  country: 'c.name',
  jobTitle: 'e.job_title COLLATE NOCASE',
  department: 'e.department',
};

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    jobTitle: row.job_title,
    department: row.department,
    countryCode: row.country_code,
    countryName: row.country_name,
    currency: row.currency_code,
    salary: row.salary,
    salaryUsd: row.salary_usd,
    hireDate: row.hire_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export class EmployeeRepository {
  constructor(private readonly db: Database) {}

  list(query: EmployeeListQuery): Page<Employee> {
    const where: string[] = [];
    const params: SQLInputValue[] = [];

    if (query.search) {
      const pattern = `%${escapeLike(query.search)}%`;
      where.push(`(e.full_name LIKE ? ESCAPE '\\' OR e.email LIKE ? ESCAPE '\\')`);
      params.push(pattern, pattern);
    }
    if (query.country) {
      where.push('e.country_code = ?');
      params.push(query.country);
    }
    if (query.department) {
      where.push('e.department = ?');
      params.push(query.department);
    }
    if (query.jobTitle) {
      where.push('e.job_title = ? COLLATE NOCASE');
      params.push(query.jobTitle);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const direction = query.order === 'desc' ? 'DESC' : 'ASC';
    const offset = (query.page - 1) * query.pageSize;

    const { total } = this.db
      .prepare(`SELECT COUNT(*) AS total FROM employees e ${whereSql}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(`${SELECT_EMPLOYEE} ${whereSql} ORDER BY ${ORDER_BY[query.sort]} ${direction}, e.id ${direction} LIMIT ? OFFSET ?`)
      .all(...params, query.pageSize, offset) as unknown as EmployeeRow[];

    return { items: rows.map(toEmployee), total, page: query.page, pageSize: query.pageSize };
  }

  findById(id: number): Employee | undefined {
    const row = this.db.prepare(`${SELECT_EMPLOYEE} WHERE e.id = ?`).get(id) as EmployeeRow | undefined;
    return row && toEmployee(row);
  }

  insert(input: EmployeeInput, now: string): number {
    const result = this.db
      .prepare(
        `INSERT INTO employees (full_name, email, job_title, department, country_code, salary, hire_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.fullName, input.email, input.jobTitle, input.department, input.countryCode, input.salary, input.hireDate, now, now);
    return Number(result.lastInsertRowid);
  }

  update(id: number, input: EmployeeInput, now: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE employees
         SET full_name = ?, email = ?, job_title = ?, department = ?, country_code = ?, salary = ?, hire_date = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(input.fullName, input.email, input.jobTitle, input.department, input.countryCode, input.salary, input.hireDate, now, id);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    return this.db.prepare('DELETE FROM employees WHERE id = ?').run(id).changes > 0;
  }

  insertSalaryChange(employeeId: number, change: Omit<SalaryChange, 'id'>): void {
    this.db
      .prepare(
        `INSERT INTO salary_changes (employee_id, previous_salary, new_salary, currency_code, effective_date)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(employeeId, change.previousSalary, change.newSalary, change.currency, change.effectiveDate);
  }

  /** Most recent change first. */
  salaryHistory(employeeId: number): SalaryChange[] {
    const rows = this.db
      .prepare(
        `SELECT id, previous_salary, new_salary, currency_code, effective_date
         FROM salary_changes WHERE employee_id = ?
         ORDER BY effective_date DESC, id DESC`,
      )
      .all(employeeId) as unknown as SalaryChangeRow[];
    return rows.map((r) => ({
      id: r.id,
      previousSalary: r.previous_salary,
      newSalary: r.new_salary,
      currency: r.currency_code,
      effectiveDate: r.effective_date,
    }));
  }

  distinctJobTitles(): string[] {
    const rows = this.db
      .prepare('SELECT DISTINCT job_title FROM employees ORDER BY job_title COLLATE NOCASE')
      .all() as { job_title: string }[];
    return rows.map((r) => r.job_title);
  }
}
