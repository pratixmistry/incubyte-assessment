import { describe, expect, it } from 'vitest';
import { applyQueryChanges, DEFAULT_QUERY, hasActiveFilters, nextSort, parseEmployeeQuery } from './employeeQuery';

const params = (s: string) => new URLSearchParams(s);

describe('parseEmployeeQuery', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseEmployeeQuery(params(''))).toEqual({
      ...DEFAULT_QUERY,
      search: undefined,
      country: undefined,
      department: undefined,
      jobTitle: undefined,
    });
  });

  it('reads filters, sort and paging', () => {
    expect(parseEmployeeQuery(params('country=IN&jobTitle=QA%20Engineer&page=3&pageSize=50&sort=salary&order=desc'))).toMatchObject({
      country: 'IN',
      jobTitle: 'QA Engineer',
      page: 3,
      pageSize: 50,
      sort: 'salary',
      order: 'desc',
    });
  });

  it('falls back to defaults for tampered values instead of sending them to the API', () => {
    expect(parseEmployeeQuery(params('page=-2&pageSize=9999&sort=ssn&order=sideways'))).toMatchObject(DEFAULT_QUERY);
  });
});

describe('applyQueryChanges', () => {
  it('resets to page 1 when a filter changes', () => {
    expect(applyQueryChanges(params('page=4'), { country: 'DE' }).toString()).toBe('country=DE');
  });

  it('keeps the page when only the page changes', () => {
    expect(applyQueryChanges(params('country=DE'), { page: 2 }).toString()).toBe('country=DE&page=2');
  });

  it('removes cleared filters and default values to keep URLs short', () => {
    const next = applyQueryChanges(params('country=DE&sort=salary'), { country: null, sort: 'name' });
    expect(next.toString()).toBe('');
  });

  it('preserves unrelated params such as the open employee', () => {
    expect(applyQueryChanges(params('employee=12'), { search: 'ana' }).get('employee')).toBe('12');
  });
});

describe('nextSort', () => {
  it('toggles direction on the active column', () => {
    expect(nextSort({ ...DEFAULT_QUERY, sort: 'name', order: 'asc' }, 'name')).toEqual({ sort: 'name', order: 'desc' });
  });

  it('starts salary highest-first and names A–Z', () => {
    expect(nextSort(DEFAULT_QUERY, 'salary')).toEqual({ sort: 'salary', order: 'desc' });
    expect(nextSort({ ...DEFAULT_QUERY, sort: 'salary' }, 'country')).toEqual({ sort: 'country', order: 'asc' });
  });
});

describe('hasActiveFilters', () => {
  it('ignores paging and sorting', () => {
    expect(hasActiveFilters({ ...DEFAULT_QUERY, page: 3, sort: 'salary' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_QUERY, search: 'x' })).toBe(true);
  });
});
