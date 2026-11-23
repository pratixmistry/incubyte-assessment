import { z } from 'zod';
import { DEPARTMENTS, findCountry } from './reference.js';

/** Largest annual salary we accept in any currency (guards against typos like an extra 3 zeros in JPY). */
export const MAX_SALARY = 10_000_000_000;

export const employeeInputSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')).pipe(z.string().max(254)),
  jobTitle: z.string().trim().min(1, 'Job title is required').max(100),
  department: z.enum(DEPARTMENTS, { message: 'Choose a valid department' }),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((code) => findCountry(code) !== undefined, 'Choose a valid country'),
  salary: z
    .number({ message: 'Salary must be a number' })
    .int('Salary must be a whole number')
    .positive('Salary must be greater than zero')
    .max(MAX_SALARY, 'Salary is unrealistically large'),
  hireDate: z.iso.date('Hire date must be a date (YYYY-MM-DD)'),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

export const SORT_FIELDS = ['name', 'salary', 'hireDate', 'country', 'jobTitle', 'department'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

const optionalFilter = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const employeeListQuerySchema = z.object({
  search: optionalFilter,
  country: optionalFilter.transform((v) => v?.toUpperCase()),
  department: optionalFilter,
  jobTitle: optionalFilter,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(SORT_FIELDS).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

/** Employee as returned by the API. */
export interface Employee {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  countryName: string;
  currency: string;
  salary: number;
  salaryUsd: number;
  hireDate: string;
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

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
