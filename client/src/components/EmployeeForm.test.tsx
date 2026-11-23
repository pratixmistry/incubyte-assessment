import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { EmployeeInput } from '../api/types';
import { renderWithProviders } from '../test/render';
import { EmployeeForm } from './EmployeeForm';

const meta = {
  countries: [
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'IN', name: 'India', currency: 'INR' },
  ],
  departments: ['Engineering', 'Finance'],
  jobTitles: ['Software Engineer'],
};

const existing: EmployeeInput = {
  fullName: 'Priya Patel',
  email: 'priya.patel@acme.example',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  countryCode: 'IN',
  salary: 3_000_000,
  hireDate: '2021-04-12',
};

function setup(onSubmit = vi.fn().mockResolvedValue(undefined), initialValues?: EmployeeInput) {
  renderWithProviders(
    <EmployeeForm meta={meta} initialValues={initialValues} submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('EmployeeForm', () => {
  it('shows validation errors and does not submit an empty form', async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Salary is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the currency for the selected country', () => {
    setup(undefined, existing);
    expect(screen.getByText('Paid in INR')).toBeInTheDocument();
  });

  it('submits edited values with a numeric salary', async () => {
    const { onSubmit, user } = setup(undefined, existing);
    const salary = screen.getByLabelText(/Annual base salary/);

    await user.clear(salary);
    await user.type(salary, '3300000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ ...existing, salary: 3_300_000 }));
  });

  it('shows server-side field errors next to the field', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, 'Conflict', { email: 'An employee with email priya.patel@acme.example already exists' }),
    );
    const { user } = setup(onSubmit, existing);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
  });
});
