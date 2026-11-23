import { usdRate } from '../domain/currency.js';
import type { EmployeeInput } from '../domain/employee.js';
import { findCountry } from '../domain/reference.js';
import { COUNTRY_PROFILES, FIRST_NAMES, JOB_PROFILES, LAST_NAMES } from './catalog.js';
import { Random } from './random.js';

export interface SeedSalaryChange {
  previousSalary: number | null;
  newSalary: number;
  effectiveDate: string;
}

export interface SeedEmployee extends EmployeeInput {
  /** Oldest first; the last entry's newSalary equals `salary`. */
  salaryHistory: SeedSalaryChange[];
}

export interface GeneratorOptions {
  count: number;
  seed?: number;
  /** "Today" for the generated data set; fixed so output is reproducible. */
  referenceDate?: string;
}

const EMAIL_DOMAIN = 'acme.example';
const MAX_TENURE_YEARS = 12;

/** Rounds to a figure a person would actually be offered (nearest 100, or 1,000 for large-unit currencies). */
export function roundSalary(amount: number): number {
  const step = amount >= 1_000_000 ? 1_000 : 100;
  return Math.max(step, Math.round(amount / step) * step);
}

function addYears(isoDate: string, years: number): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  // Clamp 29 Feb to 28 Feb in non-leap years.
  const date = new Date(Date.UTC(y + years, m - 1, d));
  if (date.getUTCMonth() !== m - 1) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function randomDateWithin(random: Random, fromIso: string, toIso: string): string {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  return new Date(from + Math.floor(random.next() * (to - from))).toISOString().slice(0, 10);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '');
}

/**
 * Generates a deterministic, realistic-looking workforce.
 *
 * Salary model: role base (USD) × country pay factor × individual variation,
 * converted to local currency. Past raises are reconstructed backwards from
 * today's salary on work anniversaries.
 */
export function generateEmployees({
  count,
  seed = 42,
  referenceDate = '2026-11-01',
}: GeneratorOptions): SeedEmployee[] {
  const random = new Random(seed);
  const earliestHire = addYears(referenceDate, -MAX_TENURE_YEARS);
  const emailCounts = new Map<string, number>();
  const employees: SeedEmployee[] = [];

  for (let i = 0; i < count; i++) {
    const first = random.pick(FIRST_NAMES);
    const last = random.pick(LAST_NAMES);
    const fullName = `${first} ${last}`;

    const localPart = `${slug(first)}.${slug(last)}`;
    const seen = emailCounts.get(localPart) ?? 0;
    emailCounts.set(localPart, seen + 1);
    const email = `${localPart}${seen === 0 ? '' : seen + 1}@${EMAIL_DOMAIN}`;

    const job = random.weighted(JOB_PROFILES, (j) => j.weight);
    const countryProfile = random.weighted(COUNTRY_PROFILES, (c) => c.weight);
    const country = findCountry(countryProfile.code)!;

    const hireDate = randomDateWithin(random, earliestHire, referenceDate);
    const tenureYears = (Date.parse(referenceDate) - Date.parse(hireDate)) / (365.25 * 24 * 3600 * 1000);

    // Individual variation ±18%, plus a small tenure premium.
    const variation = random.between(0.82, 1.18) * (1 + Math.min(tenureYears, 10) * 0.01);
    const usd = job.baseUsd * countryProfile.payFactor * variation;
    const salary = roundSalary(usd / usdRate(country.currency));

    employees.push({
      fullName,
      email,
      jobTitle: job.title,
      department: job.department,
      countryCode: country.code,
      salary,
      hireDate,
      salaryHistory: buildHistory(random, salary, hireDate, Math.floor(tenureYears)),
    });
  }
  return employees;
}

function buildHistory(random: Random, currentSalary: number, hireDate: string, fullYears: number): SeedSalaryChange[] {
  const raiseCount = random.int(0, Math.min(fullYears, 4));
  // Raises happen on the most recent `raiseCount` anniversaries.
  const salaries = [currentSalary];
  for (let r = 0; r < raiseCount; r++) {
    salaries.unshift(roundSalary(salaries[0]! / random.between(1.03, 1.1)));
  }
  return salaries.map((salary, index) => ({
    previousSalary: index === 0 ? null : salaries[index - 1]!,
    newSalary: salary,
    effectiveDate: index === 0 ? hireDate : addYears(hireDate, fullYears - raiseCount + index),
  }));
}
