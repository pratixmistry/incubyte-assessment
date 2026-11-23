import {
  Alert,
  Badge,
  Button,
  Center,
  Divider,
  Drawer,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconTrendingDown, IconTrendingUp, IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useDeleteEmployee, useEmployee, useMeta, useUpdateEmployee } from '../api/hooks';
import type { EmployeeDetails, SalaryChange } from '../api/types';
import { formatDate, formatMoney, formatPercent, salaryChangePercent } from '../lib/format';
import { EmployeeForm } from './EmployeeForm';

interface EmployeeDrawerProps {
  employeeId: number | null;
  onClose: () => void;
}

export function EmployeeDrawer({ employeeId, onClose }: EmployeeDrawerProps) {
  const [editing, setEditing] = useState(false);
  const { data: employee, isLoading, error } = useEmployee(employeeId);

  const close = () => {
    setEditing(false);
    onClose();
  };

  return (
    <Drawer
      opened={employeeId !== null}
      onClose={close}
      position="right"
      size="lg"
      title={<Title order={4}>{editing ? 'Edit employee' : 'Employee'}</Title>}
    >
      {isLoading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}
      {error && <Alert color="red">{error.message}</Alert>}
      {employee &&
        (editing ? (
          <EditEmployee employee={employee} onDone={() => setEditing(false)} />
        ) : (
          <EmployeeDetailsView employee={employee} onEdit={() => setEditing(true)} onDeleted={close} />
        ))}
    </Drawer>
  );
}

function EditEmployee({ employee, onDone }: { employee: EmployeeDetails; onDone: () => void }) {
  const { data: meta } = useMeta();
  const update = useUpdateEmployee(employee.id);
  if (!meta) return <Loader />;

  return (
    <EmployeeForm
      meta={meta}
      initialValues={{
        fullName: employee.fullName,
        email: employee.email,
        jobTitle: employee.jobTitle,
        department: employee.department,
        countryCode: employee.countryCode,
        salary: employee.salary,
        hireDate: employee.hireDate,
      }}
      submitLabel="Save changes"
      onCancel={onDone}
      onSubmit={async (input) => {
        await update.mutateAsync(input);
        notifications.show({ color: 'green', message: `${input.fullName} updated` });
        onDone();
      }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text>{children}</Text>
    </div>
  );
}

function EmployeeDetailsView({
  employee,
  onEdit,
  onDeleted,
}: {
  employee: EmployeeDetails;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useDeleteEmployee();

  const handleDelete = async () => {
    await remove.mutateAsync(employee.id);
    notifications.show({ message: `${employee.fullName} deleted` });
    setConfirmingDelete(false);
    onDeleted();
  };

  return (
    <Stack>
      <div>
        <Title order={3}>{employee.fullName}</Title>
        <Text c="dimmed">{employee.email}</Text>
      </div>

      <Group gap="xs">
        <Badge variant="light">{employee.department}</Badge>
        <Badge variant="outline" color="gray">
          {employee.countryName}
        </Badge>
      </Group>

      <SimpleGrid cols={2} spacing="md">
        <Field label="Job title">{employee.jobTitle}</Field>
        <Field label="Hire date">{formatDate(employee.hireDate)}</Field>
        <Field label="Annual salary">{formatMoney(employee.salary, employee.currency)}</Field>
        {employee.currency !== 'USD' && (
          <Field label="USD equivalent">≈ {formatMoney(employee.salaryUsd, 'USD')}</Field>
        )}
      </SimpleGrid>

      <Group>
        <Button leftSection={<IconEdit size={16} />} onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="light"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={() => setConfirmingDelete(true)}
        >
          Delete
        </Button>
      </Group>

      <Divider label="Salary history" labelPosition="left" mt="md" />
      <SalaryHistory history={employee.salaryHistory} />

      <Modal opened={confirmingDelete} onClose={() => setConfirmingDelete(false)} title="Delete employee?" centered>
        <Text mb="md">
          This permanently removes <b>{employee.fullName}</b> and their salary history. This cannot be undone.
        </Text>
        {remove.error && (
          <Alert color="red" mb="md">
            {remove.error.message}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </Button>
          <Button color="red" loading={remove.isPending} onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}

function SalaryHistory({ history }: { history: SalaryChange[] }) {
  if (history.length === 0) return <Text c="dimmed">No salary changes recorded.</Text>;
  return (
    <Timeline active={0} bulletSize={26} lineWidth={2}>
      {history.map((change) => {
        const pct = salaryChangePercent(change.previousSalary, change.newSalary);
        const Icon = pct === null ? IconUserPlus : pct >= 0 ? IconTrendingUp : IconTrendingDown;
        const title =
          pct === null ? 'Starting salary' : `${pct >= 0 ? 'Raise' : 'Reduction'} ${pct >= 0 ? '+' : ''}${formatPercent(pct)}`;
        return (
          <Timeline.Item key={change.id} bullet={<Icon size={14} />} title={title}>
            <Text size="sm">
              {change.previousSalary !== null && (
                <Text span c="dimmed">
                  {formatMoney(change.previousSalary, change.currency)} →{' '}
                </Text>
              )}
              <b>{formatMoney(change.newSalary, change.currency)}</b>
            </Text>
            <Text size="xs" c="dimmed">
              {formatDate(change.effectiveDate)}
            </Text>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
