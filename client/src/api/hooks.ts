import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQueryString } from './client';
import type {
  Breakdown,
  Distribution,
  Employee,
  EmployeeDetails,
  EmployeeInput,
  EmployeeQuery,
  GroupBy,
  Meta,
  Page,
  Summary,
} from './types';

export const queryKeys = {
  meta: ['meta'] as const,
  employees: ['employees'] as const,
  employeeList: (q: EmployeeQuery) => ['employees', 'list', q] as const,
  employee: (id: number) => ['employees', 'detail', id] as const,
  insights: ['insights'] as const,
};

export function useMeta() {
  return useQuery({ queryKey: queryKeys.meta, queryFn: () => api<Meta>('/meta'), staleTime: 5 * 60_000 });
}

export function useEmployees(query: EmployeeQuery) {
  return useQuery({
    queryKey: queryKeys.employeeList(query),
    queryFn: () => api<Page<Employee>>(`/employees${toQueryString(query)}`),
    placeholderData: keepPreviousData, // keep the table steady while paging/filtering
  });
}

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: queryKeys.employee(id ?? 0),
    queryFn: () => api<EmployeeDetails>(`/employees/${id}`),
    enabled: id !== null,
  });
}

/** Any write can change lists, details, insights and the job title list. */
function useInvalidateAfterWrite() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.employees }),
      client.invalidateQueries({ queryKey: queryKeys.insights }),
      client.invalidateQueries({ queryKey: queryKeys.meta }),
    ]);
}

export function useCreateEmployee() {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (input: EmployeeInput) =>
      api<EmployeeDetails>('/employees', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee(id: number) {
  const invalidate = useInvalidateAfterWrite();
  return useMutation({
    mutationFn: (input: EmployeeInput) =>
      api<EmployeeDetails>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteEmployee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/employees/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      // Drop the deleted record instead of refetching it (which would 404).
      client.removeQueries({ queryKey: queryKeys.employee(id) });
      return Promise.all([
        client.invalidateQueries({ queryKey: [...queryKeys.employees, 'list'] }),
        client.invalidateQueries({ queryKey: queryKeys.insights }),
        client.invalidateQueries({ queryKey: queryKeys.meta }),
      ]);
    },
  });
}

export function useSummary(country?: string) {
  return useQuery({
    queryKey: [...queryKeys.insights, 'summary', country ?? null],
    queryFn: () => api<Summary>(`/insights/summary${toQueryString({ country })}`),
  });
}

export function useBreakdown(groupBy: GroupBy, country?: string) {
  return useQuery({
    queryKey: [...queryKeys.insights, 'breakdown', groupBy, country ?? null],
    queryFn: () => api<Breakdown>(`/insights/breakdown${toQueryString({ groupBy, country })}`),
    placeholderData: keepPreviousData,
  });
}

export function useDistribution(country?: string) {
  return useQuery({
    queryKey: [...queryKeys.insights, 'distribution', country ?? null],
    queryFn: () => api<Distribution>(`/insights/distribution${toQueryString({ country })}`),
    placeholderData: keepPreviousData,
  });
}
