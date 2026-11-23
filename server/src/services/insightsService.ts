import type { SQLInputValue } from 'node:sqlite';
import { z } from 'zod';
import type { Database } from '../db/database.js';
import { FX_RATES_VERSION } from '../domain/currency.js';
import { findCountry } from '../domain/reference.js';
import { histogram, type HistogramBucket, type SalaryStats, summarize } from '../domain/stats.js';

export const GROUP_BY = ['country', 'department', 'jobTitle'] as const;
export type GroupBy = (typeof GROUP_BY)[number];

const countryFilter = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || findCountry(v) !== undefined, 'Unknown country');

export const insightsQuerySchema = z.object({ country: countryFilter });
export const breakdownQuerySchema = z.object({
  country: countryFilter,
  groupBy: z.enum(GROUP_BY).default('country'),
});

interface SalaryRow {
  countryCode: string;
  countryName: string;
  department: string;
  jobTitle: string;
  salary: number;
  currency: string;
  usdRate: number;
}

/**
 * Pay statistics for a set of employees.
 *
 * Currency rule: if everyone in the set is paid in the same currency, stats
 * are in that currency (what HR thinks in). Otherwise they are normalised to
 * USD with the reference rates, because averaging INR with USD is meaningless.
 * `medianUsd`/`meanUsd` are always present so any two groups can be compared.
 */
export interface PayProfile {
  headcount: number;
  currency: string;
  stats: SalaryStats;
  totalPayroll: number;
  medianUsd: number;
  meanUsd: number;
  totalPayrollUsd: number;
}

export interface Summary extends Partial<PayProfile> {
  headcount: number;
  countries: number;
  departments: number;
  fxRatesVersion: string;
}

export interface BreakdownRow extends PayProfile {
  key: string;
  label: string;
  /** Share of the filtered headcount, 0–1. */
  headcountShare: number;
}

export interface Breakdown {
  groupBy: GroupBy;
  country: string | null;
  fxRatesVersion: string;
  rows: BreakdownRow[];
}

export interface Distribution {
  currency: string;
  buckets: HistogramBucket[];
}

function payProfile(rows: readonly SalaryRow[]): PayProfile | null {
  if (rows.length === 0) return null;
  const currencies = new Set(rows.map((r) => r.currency));
  const singleCurrency = currencies.size === 1;
  const usdValues = rows.map((r) => r.salary * r.usdRate);
  const values = singleCurrency ? rows.map((r) => r.salary) : usdValues;
  const usdStats = summarize(usdValues)!;
  const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  return {
    headcount: rows.length,
    currency: singleCurrency ? rows[0]!.currency : 'USD',
    stats: summarize(values)!,
    totalPayroll: Math.round(sum(values)),
    medianUsd: usdStats.median,
    meanUsd: usdStats.mean,
    totalPayrollUsd: Math.round(sum(usdValues)),
  };
}

const groupKey: Record<GroupBy, (r: SalaryRow) => { key: string; label: string }> = {
  country: (r) => ({ key: r.countryCode, label: r.countryName }),
  department: (r) => ({ key: r.department, label: r.department }),
  jobTitle: (r) => ({ key: r.jobTitle, label: r.jobTitle }),
};

/**
 * Answers "how do we pay people?". Medians aren't available as SQL aggregates
 * in SQLite, so we read one narrow row per employee and aggregate in memory;
 * at 10k employees that is a few milliseconds (see docs/DECISIONS.md).
 */
export class InsightsService {
  constructor(private readonly db: Database) {}

  summary(country?: string): Summary {
    const rows = this.salaryRows(country);
    return {
      ...payProfile(rows),
      headcount: rows.length,
      countries: new Set(rows.map((r) => r.countryCode)).size,
      departments: new Set(rows.map((r) => r.department)).size,
      fxRatesVersion: FX_RATES_VERSION,
    };
  }

  breakdown(groupBy: GroupBy, country?: string): Breakdown {
    const rows = this.salaryRows(country);
    const groups = new Map<string, { label: string; rows: SalaryRow[] }>();
    for (const row of rows) {
      const { key, label } = groupKey[groupBy](row);
      const group = groups.get(key) ?? { label, rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    }

    const result: BreakdownRow[] = [...groups.entries()].map(([key, group]) => ({
      key,
      label: group.label,
      headcountShare: group.rows.length / rows.length,
      ...payProfile(group.rows)!,
    }));
    result.sort((a, b) => b.medianUsd - a.medianUsd || a.label.localeCompare(b.label));

    return { groupBy, country: country ?? null, fxRatesVersion: FX_RATES_VERSION, rows: result };
  }

  distribution(country?: string, targetBuckets = 20): Distribution {
    const rows = this.salaryRows(country);
    const profileCurrency = payProfile(rows)?.currency ?? 'USD';
    const values = rows.map((r) => (profileCurrency === 'USD' ? r.salary * r.usdRate : r.salary));
    return { currency: profileCurrency, buckets: histogram(values, targetBuckets) };
  }

  private salaryRows(country?: string): SalaryRow[] {
    const params: SQLInputValue[] = [];
    let where = '';
    if (country) {
      where = 'WHERE e.country_code = ?';
      params.push(country);
    }
    return this.db
      .prepare(
        `SELECT e.country_code AS countryCode, c.name AS countryName, e.department, e.job_title AS jobTitle,
                e.salary, c.currency_code AS currency, cur.usd_rate AS usdRate
         FROM employees e
         JOIN countries c    ON c.code = e.country_code
         JOIN currencies cur ON cur.code = c.currency_code
         ${where}`,
      )
      .all(...params) as unknown as SalaryRow[];
  }
}
