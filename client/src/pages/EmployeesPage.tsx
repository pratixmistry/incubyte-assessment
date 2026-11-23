import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useCreateEmployee, useEmployees, useMeta } from '../api/hooks';
import type { EmployeeQuery, SortField } from '../api/types';
import { Combobox } from '../components/Combobox';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { EmployeeForm } from '../components/EmployeeForm';
import { PageHeader } from '../components/PageHeader';
import {
  applyQueryChanges,
  hasActiveFilters,
  nextSort,
  PAGE_SIZE_OPTIONS,
  parseEmployeeQuery,
  type QueryChanges,
} from '../lib/employeeQuery';
import { formatDate, formatMoney, formatNumber } from '../lib/format';

/** Radix Select can't hold an empty value, so "all" stands for "no filter". */
const ALL = '__all__';

export function EmployeesPage() {
  const [params, setParams] = useSearchParams();
  const query = parseEmployeeQuery(params);
  const selectedId = params.get('employee') ? Number(params.get('employee')) : null;
  const [creating, setCreating] = useState(false);

  const { data: meta } = useMeta();
  const { data, isFetching, isLoading, error } = useEmployees(query);
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
  const filtered = hasActiveFilters(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={
          data ? `${formatNumber(data.total)} ${filtered ? 'matching employees' : 'employees across all countries'}` : 'Loading…'
        }
        actions={
          <Button onClick={() => setCreating(true)} disabled={!meta}>
            <Plus /> Add employee
          </Button>
        }
      />

      <Toolbar query={query} onChange={update} onReset={() => setParams(new URLSearchParams())} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>Couldn't load employees: {error.message}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table className={cn('transition-opacity', isFetching && data && 'opacity-60')}>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <SortableHead field="name" query={query} onSort={update}>Name</SortableHead>
              <SortableHead field="jobTitle" query={query} onSort={update} className="hidden sm:table-cell">
                Job title
              </SortableHead>
              <SortableHead field="department" query={query} onSort={update} className="hidden lg:table-cell">
                Department
              </SortableHead>
              <SortableHead field="country" query={query} onSort={update} className="hidden md:table-cell">
                Country
              </SortableHead>
              <SortableHead field="salary" query={query} onSort={update} align="right">
                Annual salary
              </SortableHead>
              <SortableHead field="hireDate" query={query} onSort={update} className="hidden xl:table-cell">
                Hire date
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.items.map((e) => (
              <TableRow
                key={e.id}
                onClick={() => selectEmployee(e.id)}
                onKeyDown={(event) => event.key === 'Enter' && selectEmployee(e.id)}
                tabIndex={0}
                className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                data-state={selectedId === e.id ? 'selected' : undefined}
              >
                <TableCell>
                  <div className="font-medium">{e.fullName}</div>
                  <div className="text-xs text-muted-foreground">{e.email}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{e.jobTitle}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{e.jobTitle}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="secondary">{e.department}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{e.countryName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <div className="font-medium">{formatMoney(e.salary, e.currency)}</div>
                  {e.currency !== 'USD' && (
                    <div className="text-xs text-muted-foreground">≈ {formatMoney(e.salaryUsd, 'USD')}</div>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDate(e.hireDate)}</TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="text-muted-foreground">No employees match these filters.</p>
                  <Button variant="link" onClick={() => setParams(new URLSearchParams())}>
                    Clear filters
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatNumber((data.page - 1) * data.pageSize + 1)}–
            {formatNumber(Math.min(data.page * data.pageSize, data.total))} of {formatNumber(data.total)}
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Rows per page</span>
              <Select value={String(query.pageSize)} onValueChange={(v) => update({ pageSize: v })}>
                <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm font-medium tabular-nums">
              Page {formatNumber(query.page)} of {formatNumber(totalPages)}
            </span>
            <div className="flex items-center gap-1">
              <PageButton label="First page" disabled={query.page <= 1} onClick={() => update({ page: 1 })}>
                <ChevronsLeft />
              </PageButton>
              <PageButton label="Previous page" disabled={query.page <= 1} onClick={() => update({ page: query.page - 1 })}>
                <ChevronLeft />
              </PageButton>
              <PageButton label="Next page" disabled={query.page >= totalPages} onClick={() => update({ page: query.page + 1 })}>
                <ChevronRight />
              </PageButton>
              <PageButton label="Last page" disabled={query.page >= totalPages} onClick={() => update({ page: totalPages })}>
                <ChevronsRight />
              </PageButton>
            </div>
          </div>
        </div>
      )}

      <EmployeeDrawer employeeId={selectedId} onClose={() => selectEmployee(null)} />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>The starting salary is recorded as the first entry in their salary history.</DialogDescription>
          </DialogHeader>
          {meta && (
            <EmployeeForm
              meta={meta}
              submitLabel="Add employee"
              onCancel={() => setCreating(false)}
              onSubmit={async (input) => {
                const created = await create.mutateAsync(input);
                toast.success(`${created.fullName} added`);
                setCreating(false);
                selectEmployee(created.id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant="outline" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

function Toolbar({
  query,
  onChange,
  onReset,
}: {
  query: EmployeeQuery;
  onChange: (changes: QueryChanges) => void;
  onReset: () => void;
}) {
  const { data: meta } = useMeta();
  const [search, setSearch] = useState(query.search ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in sync when the URL changes elsewhere (e.g. "Clear filters", back button).
  useEffect(() => setSearch(query.search ?? ''), [query.search]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onSearch = (value: string) => {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange({ search: value.trim() }), 300);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-full sm:w-72">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search employees"
        />
        {search && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => onSearch('')}>
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <FilterSelect
        label="Country"
        allLabel="All countries"
        value={query.country}
        options={meta?.countries.map((c) => ({ value: c.code, label: c.name })) ?? []}
        onChange={(v) => onChange({ country: v })}
      />
      <FilterSelect
        label="Department"
        allLabel="All departments"
        value={query.department}
        options={meta?.departments.map((d) => ({ value: d, label: d })) ?? []}
        onChange={(v) => onChange({ department: v })}
      />
      <Combobox
        className="w-full sm:w-56"
        options={meta?.jobTitles ?? []}
        value={query.jobTitle ?? ''}
        onChange={(v) => onChange({ jobTitle: v === query.jobTitle ? undefined : v })}
        placeholder="All job titles"
        searchPlaceholder="Search job titles…"
        aria-label="Filter by job title"
      />

      {hasActiveFilters(query) && (
        <Button variant="ghost" onClick={onReset}>
          Reset <X />
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value?: string;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className="w-full sm:w-44" aria-label={`Filter by ${label.toLowerCase()}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortableHead({
  field,
  query,
  onSort,
  align,
  className,
  children,
}: {
  field: SortField;
  query: EmployeeQuery;
  onSort: (changes: QueryChanges) => void;
  align?: 'right';
  className?: string;
  children: ReactNode;
}) {
  const active = query.sort === field;
  const Icon = !active ? ChevronsUpDown : query.order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(align === 'right' && 'text-right', className)}
      aria-sort={active ? (query.order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn('-mx-2.5 h-8', align === 'right' && 'flex-row-reverse')}
        onClick={() => onSort(nextSort(query, field))}
        title={field === 'salary' ? 'Sorted by USD equivalent so currencies compare fairly' : undefined}
      >
        {children}
        <Icon className={cn(!active && 'text-muted-foreground/60')} />
      </Button>
    </TableHead>
  );
}
