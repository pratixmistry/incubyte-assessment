const LOCALE = 'en-US';

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Whole-unit money, e.g. "$120,000", "₹4,000,000", or compact "$120K". */
export function formatMoney(amount: number, currency: string, { compact = false } = {}): string {
  const key = `${currency}:${compact}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      minimumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard',
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(amount);
}

export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(fraction < 0.1 ? 1 : 0)}%`;
}

/** "2024-03-01" → "Mar 1, 2024". Parsed as UTC so the day never shifts with the viewer's timezone. */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Percentage change between two salaries, e.g. +8.5%. Null when not comparable. */
export function salaryChangePercent(previous: number | null, next: number): number | null {
  if (previous === null || previous <= 0) return null;
  return (next - previous) / previous;
}
