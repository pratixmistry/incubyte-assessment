import { AlertCircle, Pencil, Sparkles, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDeleteEmployee, useEmployee, useMeta, useUpdateEmployee } from '../api/hooks';
import type { EmployeeDetails, SalaryChange } from '../api/types';
import { formatDate, formatMoney, formatPercent, salaryChangePercent } from '../lib/format';
import { EmployeeForm } from './EmployeeForm';

interface EmployeeDrawerProps {
  employeeId: number | null;
  onClose: () => void;
}

/** Side sheet with an employee's details and salary history; switches to an edit form in place. */
export function EmployeeDrawer({ employeeId, onClose }: EmployeeDrawerProps) {
  const [editing, setEditing] = useState(false);
  const { data: employee, isLoading, error } = useEmployee(employeeId);

  const close = () => {
    setEditing(false);
    onClose();
  };

  return (
    <Sheet open={employeeId !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{editing ? 'Edit employee' : (employee?.fullName ?? 'Employee')}</SheetTitle>
          <SheetDescription>
            {editing ? 'Salary changes are added to the history automatically.' : (employee?.email ?? ' ')}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          {isLoading && <DetailsSkeleton />}
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {employee &&
            (editing ? (
              <EditEmployee employee={employee} onDone={() => setEditing(false)} />
            ) : (
              <EmployeeDetailsView employee={employee} onEdit={() => setEditing(true)} onDeleted={close} />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

function EditEmployee({ employee, onDone }: { employee: EmployeeDetails; onDone: () => void }) {
  const { data: meta } = useMeta();
  const update = useUpdateEmployee(employee.id);
  if (!meta) return <DetailsSkeleton />;

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
        toast.success(`${input.fullName} updated`);
        onDone();
      }}
    />
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
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
    toast(`${employee.fullName} deleted`);
    setConfirmingDelete(false);
    onDeleted();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground">Annual base salary</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(employee.salary, employee.currency)}</p>
        {employee.currency !== 'USD' && (
          <p className="text-sm text-muted-foreground tabular-nums">≈ {formatMoney(employee.salaryUsd, 'USD')} at reference rates</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{employee.department}</Badge>
        <Badge variant="outline">{employee.countryName}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <Detail label="Job title">{employee.jobTitle}</Detail>
        <Detail label="Hire date">{formatDate(employee.hireDate)}</Detail>
        <Detail label="Country">{employee.countryName}</Detail>
        <Detail label="Currency">{employee.currency}</Detail>
      </dl>

      <div className="flex gap-2">
        <Button onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
          <Trash2 /> Delete
        </Button>
      </div>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-sm font-medium">Salary history</h3>
        <SalaryHistory history={employee.salaryHistory} />
      </section>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {employee.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the employee and their salary history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{remove.error.message}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault(); // keep the dialog open until the request finishes
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SalaryHistory({ history }: { history: SalaryChange[] }) {
  if (history.length === 0) return <p className="text-sm text-muted-foreground">No salary changes recorded.</p>;
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {history.map((change, index) => {
        const pct = salaryChangePercent(change.previousSalary, change.newSalary);
        const Icon = pct === null ? Sparkles : pct >= 0 ? TrendingUp : TrendingDown;
        const title = pct === null ? 'Starting salary' : pct >= 0 ? 'Raise' : 'Reduction';
        return (
          <li key={change.id} className="relative">
            <span
              className={cn(
                'absolute top-0.5 -left-[34.5px] flex size-5 items-center justify-center rounded-full border bg-background',
                index === 0 && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              <Icon className="size-3" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{title}</span>
              {pct !== null && (
                <Badge variant={pct >= 0 ? 'secondary' : 'destructive'} className="tabular-nums">
                  {pct >= 0 ? '+' : ''}
                  {formatPercent(pct)}
                </Badge>
              )}
            </div>
            <p className="text-sm tabular-nums">
              {change.previousSalary !== null && (
                <span className="text-muted-foreground">{formatMoney(change.previousSalary, change.currency)} → </span>
              )}
              <span className="font-medium">{formatMoney(change.newSalary, change.currency)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(change.effectiveDate)}</p>
          </li>
        );
      })}
    </ol>
  );
}
