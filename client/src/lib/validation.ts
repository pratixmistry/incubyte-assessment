/**
 * Client-side checks for instant feedback. The server remains the source of
 * truth (it re-validates and its field errors are shown in the same places).
 */

export interface EmployeeFormValues {
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  /** As typed, e.g. "1,250,000"; parsed with parseSalary. */
  salary: string;
  hireDate: string;
}

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "1,250,000" → 1250000; "" → NaN. Accepts thousands separators and spaces. */
export function parseSalary(input: string): number {
  const cleaned = input.replace(/[,\s]/g, '');
  return cleaned === '' ? Number.NaN : Number(cleaned);
}

/** Formats digits as they're typed: "1250000" → "1,250,000". Non-digits are dropped. */
export function formatSalaryInput(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? Number(digits).toLocaleString('en-US') : '';
}

export function validateEmployeeForm(values: EmployeeFormValues): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};
  if (!values.fullName.trim()) errors.fullName = 'Full name is required';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (!values.jobTitle.trim()) errors.jobTitle = 'Job title is required';
  if (!values.department) errors.department = 'Choose a department';
  if (!values.countryCode) errors.countryCode = 'Choose a country';

  const salary = parseSalary(values.salary);
  if (!Number.isFinite(salary)) errors.salary = 'Salary is required';
  else if (salary <= 0) errors.salary = 'Salary must be greater than zero';
  else if (!Number.isInteger(salary)) errors.salary = 'Salary must be a whole number';

  if (!DATE_PATTERN.test(values.hireDate) || Number.isNaN(Date.parse(values.hireDate))) {
    errors.hireDate = 'Enter a hire date';
  }
  return errors;
}
