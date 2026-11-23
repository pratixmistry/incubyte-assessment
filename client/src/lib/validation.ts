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
  salary: number | string; // NumberInput yields '' when empty
  hireDate: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateEmployeeForm(values: EmployeeFormValues): Partial<Record<keyof EmployeeFormValues, string>> {
  const errors: Partial<Record<keyof EmployeeFormValues, string>> = {};
  if (!values.fullName.trim()) errors.fullName = 'Full name is required';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (!values.jobTitle.trim()) errors.jobTitle = 'Job title is required';
  if (!values.department) errors.department = 'Choose a department';
  if (!values.countryCode) errors.countryCode = 'Choose a country';

  const salary = typeof values.salary === 'number' ? values.salary : Number.NaN;
  if (!Number.isFinite(salary)) errors.salary = 'Salary is required';
  else if (salary <= 0) errors.salary = 'Salary must be greater than zero';
  else if (!Number.isInteger(salary)) errors.salary = 'Salary must be a whole number';

  if (!DATE_PATTERN.test(values.hireDate) || Number.isNaN(Date.parse(values.hireDate))) {
    errors.hireDate = 'Enter a hire date';
  }
  return errors;
}
