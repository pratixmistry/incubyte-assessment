import { AlertCircle, Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '../api/client';
import type { EmployeeInput, Meta } from '../api/types';
import {
  type EmployeeFormErrors,
  type EmployeeFormValues,
  formatSalaryInput,
  parseSalary,
  validateEmployeeForm,
} from '../lib/validation';
import { Combobox } from './Combobox';

interface EmployeeFormProps {
  meta: Pick<Meta, 'countries' | 'departments' | 'jobTitles'>;
  initialValues?: EmployeeInput;
  submitLabel: string;
  onSubmit: (input: EmployeeInput) => Promise<unknown>;
  onCancel: () => void;
}

function toFormValues(input?: EmployeeInput): EmployeeFormValues {
  if (!input) {
    return {
      fullName: '',
      email: '',
      jobTitle: '',
      department: '',
      countryCode: '',
      salary: '',
      hireDate: new Date().toISOString().slice(0, 10),
    };
  }
  return { ...input, salary: formatSalaryInput(String(input.salary)) };
}

export function EmployeeForm({ meta, initialValues, submitLabel, onSubmit, onCancel }: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>(() => toFormValues(initialValues));
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currency = meta.countries.find((c) => c.code === values.countryCode)?.currency;

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined })); // clear a field's error as soon as it's edited
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const clientErrors = validateEmployeeForm(values);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({ ...values, salary: parseSalary(values.salary) });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields as EmployeeFormErrors); // server-side field errors, shown inline
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (key: keyof EmployeeFormValues) => ({
    id: key,
    'aria-invalid': errors[key] ? true : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <FieldGroup>
        <Field data-invalid={!!errors.fullName || undefined}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input {...fieldProps('fullName')} value={values.fullName} onChange={(e) => set('fullName', e.target.value)} />
          <FieldError>{errors.fullName}</FieldError>
        </Field>

        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input
            {...fieldProps('email')}
            type="email"
            autoComplete="off"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={!!errors.jobTitle || undefined}>
            <FieldLabel htmlFor="jobTitle">Job title</FieldLabel>
            <Combobox
              {...fieldProps('jobTitle')}
              options={meta.jobTitles}
              value={values.jobTitle}
              onChange={(v) => set('jobTitle', v)}
              placeholder="Select or type a title"
              searchPlaceholder="Search or add a title…"
              allowCustom
            />
            <FieldError>{errors.jobTitle}</FieldError>
          </Field>

          <Field data-invalid={!!errors.department || undefined}>
            <FieldLabel htmlFor="department">Department</FieldLabel>
            <Select value={values.department} onValueChange={(v) => set('department', v)}>
              <SelectTrigger {...fieldProps('department')} className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {meta.departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.department}</FieldError>
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={!!errors.countryCode || undefined}>
            <FieldLabel htmlFor="countryCode">Country</FieldLabel>
            <Select value={values.countryCode} onValueChange={(v) => set('countryCode', v)}>
              <SelectTrigger {...fieldProps('countryCode')} className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {meta.countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.countryCode}</FieldError>
          </Field>

          <Field data-invalid={!!errors.hireDate || undefined}>
            <FieldLabel htmlFor="hireDate">Hire date</FieldLabel>
            <Input {...fieldProps('hireDate')} type="date" value={values.hireDate} onChange={(e) => set('hireDate', e.target.value)} />
            <FieldError>{errors.hireDate}</FieldError>
          </Field>
        </div>

        <Field data-invalid={!!errors.salary || undefined}>
          <FieldLabel htmlFor="salary">Annual base salary</FieldLabel>
          <InputGroup>
            <InputGroupInput
              {...fieldProps('salary')}
              inputMode="numeric"
              placeholder="0"
              value={values.salary}
              onChange={(e) => set('salary', formatSalaryInput(e.target.value))}
              className="tabular-nums"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{currency ?? '—'}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>{currency ? `Paid in ${currency}` : 'Choose a country to set the currency'}</FieldDescription>
          <FieldError>{errors.salary}</FieldError>
        </Field>
      </FieldGroup>

      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
