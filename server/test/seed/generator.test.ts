import { describe, expect, it } from 'vitest';
import { toUsd } from '../../src/domain/currency.js';
import { employeeInputSchema } from '../../src/domain/employee.js';
import { findCountry } from '../../src/domain/reference.js';
import { summarize } from '../../src/domain/stats.js';
import { generateEmployees, roundSalary } from '../../src/seed/generator.js';

const REFERENCE_DATE = '2026-11-01';
const employees = generateEmployees({ count: 2_000, seed: 7, referenceDate: REFERENCE_DATE });

describe('generateEmployees', () => {
  it('generates the requested number of employees', () => {
    expect(employees).toHaveLength(2_000);
  });

  it('is deterministic for a given seed', () => {
    const again = generateEmployees({ count: 50, seed: 7, referenceDate: REFERENCE_DATE });
    expect(again).toEqual(employees.slice(0, 50));
  });

  it('produces different data for a different seed', () => {
    const other = generateEmployees({ count: 50, seed: 8, referenceDate: REFERENCE_DATE });
    expect(other).not.toEqual(employees.slice(0, 50));
  });

  it('produces only records that pass the same validation as the API', () => {
    for (const { salaryHistory: _history, ...input } of employees) {
      expect(employeeInputSchema.safeParse(input).success, input.email).toBe(true);
    }
  });

  it('gives every employee a unique email', () => {
    const emails = new Set(employees.map((e) => e.email));
    expect(emails.size).toBe(employees.length);
  });

  it('never hires anyone after the reference date', () => {
    expect(employees.every((e) => e.hireDate <= REFERENCE_DATE)).toBe(true);
  });

  it('builds a salary history that starts at hire, is chronological, and ends at the current salary', () => {
    for (const e of employees) {
      const history = e.salaryHistory;
      expect(history[0]!.previousSalary).toBeNull();
      expect(history[0]!.effectiveDate).toBe(e.hireDate);
      expect(history.at(-1)!.newSalary).toBe(e.salary);
      for (let i = 1; i < history.length; i++) {
        expect(history[i]!.previousSalary).toBe(history[i - 1]!.newSalary);
        expect(history[i]!.newSalary).toBeGreaterThan(history[i - 1]!.newSalary);
        expect(history[i]!.effectiveDate > history[i - 1]!.effectiveDate).toBe(true);
        expect(history[i]!.effectiveDate <= REFERENCE_DATE).toBe(true);
      }
    }
  });

  it('pays the same role less in lower-cost countries once normalised to USD', () => {
    const medianUsd = (country: string) =>
      summarize(
        employees
          .filter((e) => e.countryCode === country && e.jobTitle === 'Software Engineer')
          .map((e) => toUsd(e.salary, findCountry(country)!.currency)),
      )!.median;

    expect(medianUsd('US')).toBeGreaterThan(110_000);
    expect(medianUsd('US')).toBeLessThan(150_000);
    expect(medianUsd('IN')).toBeLessThan(medianUsd('US') / 2);
  });
});

describe('roundSalary', () => {
  it('rounds to the nearest 100 for typical amounts', () => {
    expect(roundSalary(123_456)).toBe(123_500);
  });

  it('rounds to the nearest 1,000 for large-unit currencies such as JPY or INR', () => {
    expect(roundSalary(8_765_432)).toBe(8_765_000);
  });

  it('never rounds down to zero', () => {
    expect(roundSalary(10)).toBe(100);
  });
});
