/** Pure statistics helpers used by the insights service. */

export interface SalaryStats {
  count: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  mean: number;
}

/**
 * Quantile of an ascending-sorted array using linear interpolation between
 * closest ranks (the same method as Excel's PERCENTILE.INC, which HR users
 * are used to).
 */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error('quantile of empty array');
  if (q < 0 || q > 1) throw new Error('q must be within [0, 1]');
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const lowerValue = sorted[lower]!;
  const upperValue = sorted[upper]!;
  return lowerValue + (upperValue - lowerValue) * (position - lower);
}

/** Summary statistics, rounded to whole currency units. Null for no data. */
export function summarize(values: readonly number[]): SalaryStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);
  return {
    count: sorted.length,
    min: sorted[0]!,
    p25: Math.round(quantile(sorted, 0.25)),
    median: Math.round(quantile(sorted, 0.5)),
    p75: Math.round(quantile(sorted, 0.75)),
    max: sorted[sorted.length - 1]!,
    mean: Math.round(total / sorted.length),
  };
}

export interface HistogramBucket {
  from: number; // inclusive
  to: number; // exclusive (inclusive for the last bucket)
  count: number;
}

/** Rounds a raw step up to a "nice" number: 1, 2, 2.5 or 5 × 10^n. */
export function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const nice = [1, 2, 2.5, 5, 10].find((n) => normalized <= n) ?? 10;
  return nice * magnitude;
}

/**
 * Buckets values into equal-width bins with human-friendly boundaries
 * (e.g. 50,000–60,000 rather than 48,213–58,907).
 */
export function histogram(values: readonly number[], targetBuckets = 20): HistogramBucket[] {
  if (values.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const step = niceStep((max - min) / targetBuckets);
  const start = Math.floor(min / step) * step;
  const bucketCount = Math.max(1, Math.floor((max - start) / step) + 1);
  const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    from: start + i * step,
    to: start + (i + 1) * step,
    count: 0,
  }));
  for (const v of values) {
    const index = Math.min(bucketCount - 1, Math.floor((v - start) / step));
    buckets[index]!.count += 1;
  }
  return buckets;
}
