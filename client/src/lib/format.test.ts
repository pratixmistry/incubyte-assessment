import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatPercent, salaryChangePercent } from './format';

describe('formatMoney', () => {
  it('formats whole units with the currency symbol', () => {
    expect(formatMoney(120_000, 'USD')).toBe('$120,000');
    expect(formatMoney(4_000_000, 'INR')).toBe('₹4,000,000');
  });

  it('supports a compact form for charts and KPI cards', () => {
    expect(formatMoney(120_000, 'USD', { compact: true })).toBe('$120K');
    expect(formatMoney(1_250_000, 'EUR', { compact: true })).toBe('€1.3M');
  });
});

describe('formatDate', () => {
  it('does not shift the day with the viewer timezone', () => {
    expect(formatDate('2024-03-01')).toBe('Mar 1, 2024');
  });
});

describe('formatPercent', () => {
  it('shows one decimal for small changes and none for large ones', () => {
    expect(formatPercent(0.055)).toBe('5.5%');
    expect(formatPercent(0.25)).toBe('25%');
  });
});

describe('salaryChangePercent', () => {
  it('computes the relative change', () => {
    expect(salaryChangePercent(100_000, 110_000)).toBeCloseTo(0.1);
  });

  it('is null for a starting salary or an incomparable previous amount', () => {
    expect(salaryChangePercent(null, 50_000)).toBeNull();
    expect(salaryChangePercent(0, 50_000)).toBeNull();
  });
});
