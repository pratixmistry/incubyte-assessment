import type { Clock } from '../clock.js';
import { type Database, withTransaction } from '../db/database.js';
import type { Employee, EmployeeInput, EmployeeListQuery, Page, SalaryChange } from '../domain/employee.js';
import { findCountry } from '../domain/reference.js';
import { ConflictError, NotFoundError } from '../errors.js';
import { EmployeeRepository } from '../repositories/employeeRepository.js';

export interface EmployeeDetails extends Employee {
  salaryHistory: SalaryChange[];
}

/**
 * Business rules for managing employees. The key rule: every change to an
 * employee's salary (including the starting salary) is recorded in the
 * salary history, atomically with the change itself.
 */
export class EmployeeService {
  private readonly repo: EmployeeRepository;

  constructor(
    private readonly db: Database,
    private readonly clock: Clock,
  ) {
    this.repo = new EmployeeRepository(db);
  }

  list(query: EmployeeListQuery): Page<Employee> {
    return this.repo.list(query);
  }

  get(id: number): EmployeeDetails {
    const employee = this.repo.findById(id);
    if (!employee) throw new NotFoundError(`Employee ${id} not found`);
    return { ...employee, salaryHistory: this.repo.salaryHistory(id) };
  }

  create(input: EmployeeInput): EmployeeDetails {
    const id = this.withEmailConflictCheck(input.email, () =>
      withTransaction(this.db, () => {
        const newId = this.repo.insert(input, this.clock.now());
        this.repo.insertSalaryChange(newId, {
          previousSalary: null,
          newSalary: input.salary,
          currency: currencyOf(input.countryCode),
          effectiveDate: input.hireDate,
        });
        return newId;
      }),
    );
    return this.get(id);
  }

  update(id: number, input: EmployeeInput): EmployeeDetails {
    this.withEmailConflictCheck(input.email, () =>
      withTransaction(this.db, () => {
        const existing = this.repo.findById(id);
        if (!existing) throw new NotFoundError(`Employee ${id} not found`);
        this.repo.update(id, input, this.clock.now());

        const newCurrency = currencyOf(input.countryCode);
        const salaryChanged = existing.salary !== input.salary || existing.currency !== newCurrency;
        if (salaryChanged) {
          this.repo.insertSalaryChange(id, {
            // A previous amount in a different currency isn't comparable; don't imply a raise/cut.
            previousSalary: existing.currency === newCurrency ? existing.salary : null,
            newSalary: input.salary,
            currency: newCurrency,
            effectiveDate: this.clock.today(),
          });
        }
      }),
    );
    return this.get(id);
  }

  delete(id: number): void {
    if (!this.repo.delete(id)) throw new NotFoundError(`Employee ${id} not found`);
  }

  jobTitles(): string[] {
    return this.repo.distinctJobTitles();
  }

  private withEmailConflictCheck<T>(email: string, fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed: employees.email')) {
        throw new ConflictError(`An employee with email ${email} already exists`);
      }
      throw error;
    }
  }
}

function currencyOf(countryCode: string): string {
  const country = findCountry(countryCode);
  if (!country) throw new Error(`Unknown country ${countryCode}`); // validated upstream
  return country.currency;
}
