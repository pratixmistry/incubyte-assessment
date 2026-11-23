import type { EmployeeQuery, SortField, SortOrder } from '../api/types';

/**
 * The directory's filters/sort/page live in the URL so a view can be
 * bookmarked, shared with a colleague, or restored with the back button.
 */

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const SORT_FIELDS: readonly SortField[] = ['name', 'salary', 'hireDate', 'country', 'jobTitle', 'department'];
const FILTER_KEYS = ['search', 'country', 'department', 'jobTitle'] as const;

export const DEFAULT_QUERY: EmployeeQuery = { page: 1, pageSize: 25, sort: 'name', order: 'asc' };

function positiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function parseEmployeeQuery(params: URLSearchParams): EmployeeQuery {
  const sort = params.get('sort') as SortField | null;
  const pageSize = positiveInt(params.get('pageSize'), DEFAULT_QUERY.pageSize);
  return {
    search: params.get('search') ?? undefined,
    country: params.get('country') ?? undefined,
    department: params.get('department') ?? undefined,
    jobTitle: params.get('jobTitle') ?? undefined,
    page: positiveInt(params.get('page'), DEFAULT_QUERY.page),
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_QUERY.pageSize,
    sort: sort && SORT_FIELDS.includes(sort) ? sort : DEFAULT_QUERY.sort,
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
  };
}

export type QueryChanges = Partial<Record<keyof EmployeeQuery, string | number | undefined | null>>;

/**
 * Applies changes to the URL params. Defaults are omitted to keep URLs short,
 * and changing a filter, sort or page size resets to page 1 (otherwise you can
 * land on an empty page 37 of a 2-page result).
 */
export function applyQueryChanges(params: URLSearchParams, changes: QueryChanges): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    const isDefault = String(DEFAULT_QUERY[key as keyof EmployeeQuery] ?? '') === String(value ?? '');
    if (value === undefined || value === null || value === '' || isDefault) next.delete(key);
    else next.set(key, String(value));
  }
  const resetsPage = Object.keys(changes).some(
    (key) => key !== 'page' && ([...FILTER_KEYS, 'sort', 'order', 'pageSize'] as string[]).includes(key),
  );
  if (resetsPage && !('page' in changes)) next.delete('page');
  return next;
}

/** Clicking a sorted column toggles direction; a new column starts ascending (salary/hire date start descending). */
export function nextSort(current: EmployeeQuery, field: SortField): { sort: SortField; order: SortOrder } {
  if (current.sort === field) return { sort: field, order: current.order === 'asc' ? 'desc' : 'asc' };
  return { sort: field, order: field === 'salary' || field === 'hireDate' ? 'desc' : 'asc' };
}

export function hasActiveFilters(query: EmployeeQuery): boolean {
  return FILTER_KEYS.some((key) => Boolean(query[key]));
}
