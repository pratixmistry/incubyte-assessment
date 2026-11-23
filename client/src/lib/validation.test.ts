import { describe, expect, it } from 'vitest';
import { type EmployeeFormValues, formatSalaryInput, parseSalary, validateEmployeeForm } from './validation';

const valid: EmployeeFormValues = {
  fullName: 'Ada Lovelace',
  email: 'ada@acme.example',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  countryCode: 'GB',
  salary: '85,000',
  hireDate: '2024-01-15',
};

describe('formatSalaryInput', () => {
  it('adds thousands separators as the user types', () => {
    expect(formatSalaryInput('1250000')).toBe('1,250,000');
  });

  it('drops anything that is not a digit, including leading zeros', () => {
    expect(formatSalaryInput('00a12.5')).toBe('125');
    expect(formatSalaryInput('')).toBe('');
  });
});

describe('parseSalary', () => {
  it('reads formatted input back as a number', () => {
    expect(parseSalary('1,250,000')).toBe(1_250_000);
  });

  it('is NaN for empty input', () => {
    expect(parseSalary('')).toBeNaN();
  });
});

describe('validateEmployeeForm', () => {
  it('accepts a complete form', () => {
    expect(validateEmployeeForm(valid)).toEqual({});
  });

  it('reports each missing or invalid field', () => {
    const errors = validateEmployeeForm({ ...valid, fullName: ' ', email: 'nope', salary: '0', hireDate: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'hireDate', 'salary']);
    expect(errors.salary).toBe('Salary must be greater than zero');
  });
});
