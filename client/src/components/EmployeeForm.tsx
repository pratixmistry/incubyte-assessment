import { Alert, Autocomplete, Button, Group, NumberInput, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { ApiError } from '../api/client';
import type { EmployeeInput, Meta } from '../api/types';
import { type EmployeeFormValues, validateEmployeeForm } from '../lib/validation';

interface EmployeeFormProps {
  meta: Pick<Meta, 'countries' | 'departments' | 'jobTitles'>;
  initialValues?: EmployeeInput;
  submitLabel: string;
  onSubmit: (input: EmployeeInput) => Promise<unknown>;
  onCancel: () => void;
}

const EMPTY: EmployeeFormValues = {
  fullName: '',
  email: '',
  jobTitle: '',
  department: '',
  countryCode: '',
  salary: '',
  hireDate: new Date().toISOString().slice(0, 10),
};

export function EmployeeForm({ meta, initialValues, submitLabel, onSubmit, onCancel }: EmployeeFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EmployeeFormValues>({
    mode: 'controlled',
    initialValues: initialValues ?? EMPTY,
    validate: validateEmployeeForm,
  });

  const currency = meta.countries.find((c) => c.code === form.values.countryCode)?.currency;

  const handleSubmit = form.onSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit({ ...values, salary: Number(values.salary) });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        form.setErrors(error.fields); // show server-side field errors inline
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong');
      }
    }
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="sm">
        <TextInput label="Full name" withAsterisk {...form.getInputProps('fullName')} />
        <TextInput label="Work email" type="email" withAsterisk {...form.getInputProps('email')} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Autocomplete
            label="Job title"
            withAsterisk
            data={meta.jobTitles}
            limit={12}
            {...form.getInputProps('jobTitle')}
          />
          <Select label="Department" withAsterisk data={meta.departments} {...form.getInputProps('department')} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Country"
            withAsterisk
            searchable
            data={meta.countries.map((c) => ({ value: c.code, label: c.name }))}
            {...form.getInputProps('countryCode')}
          />
          <TextInput label="Hire date" type="date" withAsterisk {...form.getInputProps('hireDate')} />
        </SimpleGrid>
        <NumberInput
          label="Annual base salary"
          description={currency ? `Paid in ${currency}` : 'Choose a country to set the currency'}
          withAsterisk
          min={0}
          step={1000}
          allowDecimal={false}
          allowNegative={false}
          thousandSeparator=","
          leftSection={currency ?? undefined}
          leftSectionWidth={currency ? 52 : undefined}
          {...form.getInputProps('salary')}
        />
        {formError && (
          <Alert color="red" variant="light" role="alert">
            {formError}
          </Alert>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={form.submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
