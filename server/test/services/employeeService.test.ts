import { beforeEach, describe, expect, it } from 'vitest';
import { employeeListQuerySchema } from '../../src/domain/employee.js';
import { ConflictError, NotFoundError } from '../../src/errors.js';
import type { EmployeeService } from '../../src/services/employeeService.js';
import { anEmployee, TEST_NOW, testService } from '../helpers.js';

const query = (q: Record<string, unknown> = {}) => employeeListQuerySchema.parse(q);

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    ({ service } = testService());
  });

  describe('create', () => {
    it('stores the employee and derives currency and USD salary from the country', () => {
      const created = service.create(anEmployee({ countryCode: 'GB', salary: 50_000 }));

      expect(created).toMatchObject({
        id: expect.any(Number),
        countryName: 'United Kingdom',
        currency: 'GBP',
        salary: 50_000,
        salaryUsd: 63_500,
        createdAt: TEST_NOW,
      });
    });

    it('records the starting salary as the first salary history entry', () => {
      const created = service.create(anEmployee({ salary: 90_000, hireDate: '2024-01-10' }));

      expect(created.salaryHistory).toEqual([
        { id: expect.any(Number), previousSalary: null, newSalary: 90_000, currency: 'USD', effectiveDate: '2024-01-10' },
      ]);
    });

    it('rejects a duplicate email (case-insensitive) with a ConflictError', () => {
      service.create(anEmployee({ email: 'sam@acme.example' }));
      expect(() => service.create(anEmployee({ email: 'SAM@acme.example' }))).toThrow(ConflictError);
    });
  });

  describe('update', () => {
    it('appends a salary history entry when the salary changes', () => {
      const { id } = service.create(anEmployee({ salary: 100_000 }));

      const updated = service.update(id, anEmployee({ salary: 110_000 }));

      expect(updated.salary).toBe(110_000);
      expect(updated.salaryHistory[0]).toMatchObject({
        previousSalary: 100_000,
        newSalary: 110_000,
        effectiveDate: '2026-06-15',
      });
      expect(updated.salaryHistory).toHaveLength(2);
    });

    it('does not add salary history when only other fields change', () => {
      const original = anEmployee();
      const { id } = service.create(original);

      const updated = service.update(id, { ...original, jobTitle: 'Senior Software Engineer' });

      expect(updated.jobTitle).toBe('Senior Software Engineer');
      expect(updated.salaryHistory).toHaveLength(1);
    });

    it('does not present a country move as a raise or cut, since currencies differ', () => {
      const original = anEmployee({ countryCode: 'US', salary: 100_000 });
      const { id } = service.create(original);

      const updated = service.update(id, { ...original, countryCode: 'DE', salary: 85_000 });

      expect(updated.salaryHistory[0]).toMatchObject({ previousSalary: null, newSalary: 85_000, currency: 'EUR' });
    });

    it('throws NotFoundError for an unknown employee', () => {
      expect(() => service.update(999, anEmployee())).toThrow(NotFoundError);
    });

    it('rejects changing email to one used by another employee', () => {
      service.create(anEmployee({ email: 'taken@acme.example' }));
      const other = anEmployee();
      const { id } = service.create(other);

      expect(() => service.update(id, { ...other, email: 'taken@acme.example' })).toThrow(ConflictError);
    });
  });

  describe('delete', () => {
    it('removes the employee and their salary history', () => {
      const { id } = service.create(anEmployee());
      service.delete(id);
      expect(() => service.get(id)).toThrow(NotFoundError);
    });

    it('throws NotFoundError for an unknown employee', () => {
      expect(() => service.delete(999)).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      service.create(anEmployee({ fullName: 'Priya Patel', countryCode: 'IN', salary: 3_000_000, jobTitle: 'Software Engineer' }));
      service.create(anEmployee({ fullName: 'John Smith', countryCode: 'US', salary: 120_000, jobTitle: 'Software Engineer' }));
      service.create(anEmployee({ fullName: 'Anna Schmidt', countryCode: 'DE', salary: 70_000, department: 'Finance', jobTitle: 'Accountant' }));
    });

    it('sorts by name by default', () => {
      expect(service.list(query()).items.map((e) => e.fullName)).toEqual(['Anna Schmidt', 'John Smith', 'Priya Patel']);
    });

    it('sorts salary by USD equivalent, not raw amount, so currencies are comparable', () => {
      const names = service.list(query({ sort: 'salary', order: 'desc' })).items.map((e) => e.fullName);
      // 3,000,000 INR ≈ $34.5k is the lowest despite being the largest number.
      expect(names).toEqual(['John Smith', 'Anna Schmidt', 'Priya Patel']);
    });

    it('searches name and email case-insensitively', () => {
      expect(service.list(query({ search: 'smi' })).items.map((e) => e.fullName)).toEqual(['John Smith']);
    });

    it('treats % and _ in search as literal characters', () => {
      expect(service.list(query({ search: '%' })).total).toBe(0);
    });

    it('combines filters', () => {
      const result = service.list(query({ country: 'us', jobTitle: 'software engineer' }));
      expect(result.items.map((e) => e.fullName)).toEqual(['John Smith']);
      expect(service.list(query({ department: 'Finance' })).total).toBe(1);
    });

    it('paginates and reports the total across all pages', () => {
      const page2 = service.list(query({ pageSize: 2, page: 2 }));
      expect(page2).toMatchObject({ total: 3, page: 2, pageSize: 2 });
      expect(page2.items.map((e) => e.fullName)).toEqual(['Priya Patel']);
    });
  });
});
