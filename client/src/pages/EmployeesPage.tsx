import {
  Alert,
  Button,
  Card,
  Center,
  Group,
  LoadingOverlay,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconPlus, IconSearch, IconSelector, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCreateEmployee, useEmployees, useMeta } from '../api/hooks';
import type { EmployeeQuery, SortField } from '../api/types';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { EmployeeForm } from '../components/EmployeeForm';
import {
  applyQueryChanges,
  hasActiveFilters,
  nextSort,
  PAGE_SIZE_OPTIONS,
  parseEmployeeQuery,
  type QueryChanges,
} from '../lib/employeeQuery';
import { formatDate, formatMoney, formatNumber } from '../lib/format';

export function EmployeesPage() {
  const [params, setParams] = useSearchParams();
  const query = parseEmployeeQuery(params);
  const selectedId = params.get('employee') ? Number(params.get('employee')) : null;
  const [creating, setCreating] = useState(false);

  const { data: meta } = useMeta();
  const { data, isFetching, error } = useEmployees(query);
  const create = useCreateEmployee();

  const update = (changes: QueryChanges) => setParams((current) => applyQueryChanges(current, changes));
  const selectEmployee = (id: number | null) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (id === null) next.delete('employee');
      else next.set('employee', String(id));
      return next;
    });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Employees</Title>
          <Text c="dimmed" size="sm">
            {data ? `${formatNumber(data.total)} ${hasActiveFilters(query) ? 'matching' : 'total'}` : ' '}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)} disabled={!meta}>
          Add employee
        </Button>
      </Group>

      <Filters query={query} onChange={update} />

      <Card withBorder p={0} pos="relative">
        <LoadingOverlay visible={isFetching && !data} />
        {error && (
          <Alert color="red" m="md">
            Couldn't load employees: {error.message}
          </Alert>
        )}
        <Table.ScrollContainer minWidth={820}>
          <Table highlightOnHover verticalSpacing="sm" style={{ opacity: isFetching && data ? 0.6 : 1 }}>
            <Table.Thead>
              <Table.Tr>
                <SortableTh field="name" query={query} onSort={update}>Name</SortableTh>
                <SortableTh field="jobTitle" query={query} onSort={update}>Job title</SortableTh>
                <SortableTh field="department" query={query} onSort={update}>Department</SortableTh>
                <SortableTh field="country" query={query} onSort={update}>Country</SortableTh>
                <SortableTh field="salary" query={query} onSort={update} align="right">Annual salary</SortableTh>
                <SortableTh field="hireDate" query={query} onSort={update}>Hire date</SortableTh>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data?.items.map((e) => (
                <Table.Tr key={e.id} onClick={() => selectEmployee(e.id)} style={{ cursor: 'pointer' }}>
                  <Table.Td>
                    <Text fw={500}>{e.fullName}</Text>
                    <Text size="xs" c="dimmed">
                      {e.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>{e.jobTitle}</Table.Td>
                  <Table.Td>{e.department}</Table.Td>
                  <Table.Td>{e.countryName}</Table.Td>
                  <Table.Td ta="right">
                    <Text fw={500}>{formatMoney(e.salary, e.currency)}</Text>
                    {e.currency !== 'USD' && (
                      <Text size="xs" c="dimmed">
                        ≈ {formatMoney(e.salaryUsd, 'USD')}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{formatDate(e.hireDate)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {data?.items.length === 0 && (
          <Center p="xl">
            <Stack align="center" gap="xs">
              <Text c="dimmed">No employees match these filters.</Text>
              <Button variant="subtle" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </Button>
            </Stack>
          </Center>
        )}
      </Card>

      {data && data.total > 0 && (
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Rows per page
            </Text>
            <Select
              w={80}
              size="xs"
              data={PAGE_SIZE_OPTIONS.map(String)}
              value={String(query.pageSize)}
              onChange={(v) => update({ pageSize: v })}
              allowDeselect={false}
              aria-label="Rows per page"
            />
          </Group>
          <Pagination total={totalPages} value={query.page} onChange={(page) => update({ page })} />
        </Group>
      )}

      <EmployeeDrawer employeeId={selectedId} onClose={() => selectEmployee(null)} />

      <Modal opened={creating} onClose={() => setCreating(false)} title={<Title order={4}>Add employee</Title>} size="lg">
        {meta && (
          <EmployeeForm
            meta={meta}
            submitLabel="Add employee"
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const created = await create.mutateAsync(input);
              notifications.show({ color: 'green', message: `${created.fullName} added` });
              setCreating(false);
              selectEmployee(created.id);
            }}
          />
        )}
      </Modal>
    </Stack>
  );
}

function Filters({ query, onChange }: { query: EmployeeQuery; onChange: (changes: QueryChanges) => void }) {
  const { data: meta } = useMeta();
  const [search, setSearch] = useState(query.search ?? '');
  const pushSearch = useDebouncedCallback((value: string) => onChange({ search: value.trim() }), 300);

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <TextInput
        placeholder="Search name or email"
        leftSection={<IconSearch size={16} />}
        rightSection={
          search ? (
            <IconX
              size={14}
              style={{ cursor: 'pointer' }}
              aria-label="Clear search"
              onClick={() => {
                setSearch('');
                onChange({ search: undefined });
              }}
            />
          ) : null
        }
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          pushSearch(event.currentTarget.value);
        }}
        style={{ flex: '1 1 240px' }}
        aria-label="Search employees"
      />
      <Select
        placeholder="All countries"
        clearable
        searchable
        data={meta?.countries.map((c) => ({ value: c.code, label: c.name })) ?? []}
        value={query.country ?? null}
        onChange={(v) => onChange({ country: v })}
        w={180}
        aria-label="Filter by country"
      />
      <Select
        placeholder="All departments"
        clearable
        data={meta?.departments ?? []}
        value={query.department ?? null}
        onChange={(v) => onChange({ department: v })}
        w={180}
        aria-label="Filter by department"
      />
      <Select
        placeholder="All job titles"
        clearable
        searchable
        data={meta?.jobTitles ?? []}
        value={query.jobTitle ?? null}
        onChange={(v) => onChange({ jobTitle: v })}
        w={240}
        aria-label="Filter by job title"
      />
    </Group>
  );
}

function SortableTh({
  field,
  query,
  onSort,
  align,
  children,
}: {
  field: SortField;
  query: EmployeeQuery;
  onSort: (changes: QueryChanges) => void;
  align?: 'right';
  children: React.ReactNode;
}) {
  const active = query.sort === field;
  const Icon = !active ? IconSelector : query.order === 'asc' ? IconArrowUp : IconArrowDown;
  return (
    <Table.Th
      ta={align}
      aria-sort={active ? (query.order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <UnstyledButton onClick={() => onSort(nextSort(query, field))} title={field === 'salary' ? 'Sorted by USD equivalent' : undefined}>
        <Group gap={4} wrap="nowrap" justify={align === 'right' ? 'flex-end' : 'flex-start'}>
          <Text fw={600} size="sm">
            {children}
          </Text>
          <Icon size={14} opacity={active ? 1 : 0.4} />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}
