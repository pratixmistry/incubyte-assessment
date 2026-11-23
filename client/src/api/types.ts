/** Mirrors of the server's API DTOs (see server/src/domain and services). */

export interface Country {
  code: string;
  name: string;
  currency: string;
}

export interface Meta {
  countries: Country[];
  departments: string[];
  jobTitles: string[];
  fxRates: { version: string; usdPerUnit: Record<string, number> };
}

export interface EmployeeInput {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  salary: number;
  hireDate: string;
}

export interface Employee extends EmployeeInput {
  id: number;
  countryName: string;
  currency: string;
  salaryUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryChange {
  id: number;
  previousSalary: number | null;
  newSalary: number;
  currency: string;
  effectiveDate: string;
}

export interface EmployeeDetails extends Employee {
  salaryHistory: SalaryChange[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortField = 'name' | 'salary' | 'hireDate' | 'country' | 'jobTitle' | 'department';
export type SortOrder = 'asc' | 'desc';

export interface EmployeeQuery {
  search?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
  page: number;
  pageSize: number;
  sort: SortField;
  order: SortOrder;
}

export interface SalaryStats {
  count: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  mean: number;
}

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

export type GroupBy = 'country' | 'department' | 'jobTitle';

export interface BreakdownRow extends PayProfile {
  key: string;
  label: string;
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
  buckets: { from: number; to: number; count: number }[];
}
