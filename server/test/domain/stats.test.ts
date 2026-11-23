import { describe, expect, it } from 'vitest';
import { histogram, niceStep, quantile, summarize } from '../../src/domain/stats.js';

describe('quantile', () => {
  it('returns the middle element for an odd-length array', () => {
    expect(quantile([1, 2, 3], 0.5)).toBe(2);
  });

  it('interpolates between the two middle elements for an even-length array', () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25);
  });

  it('matches Excel PERCENTILE.INC for quartiles', () => {
    // PERCENTILE.INC({1,2,3,4,5,6,7,8}, 0.25) = 2.75
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8], 0.25)).toBe(2.75);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8], 0.75)).toBe(6.25);
  });

  it('returns min and max at the extremes', () => {
    expect(quantile([5, 7, 9], 0)).toBe(5);
    expect(quantile([5, 7, 9], 1)).toBe(9);
  });

  it('rejects empty input and out-of-range q', () => {
    expect(() => quantile([], 0.5)).toThrow();
    expect(() => quantile([1], 1.5)).toThrow();
  });
});

describe('summarize', () => {
  it('returns null when there is no data', () => {
    expect(summarize([])).toBeNull();
  });

  it('computes count, min, quartiles, median, max and mean regardless of input order', () => {
    expect(summarize([40_000, 10_000, 30_000, 20_000])).toEqual({
      count: 4,
      min: 10_000,
      p25: 17_500,
      median: 25_000,
      p75: 32_500,
      max: 40_000,
      mean: 25_000,
    });
  });

  it('rounds to whole currency units', () => {
    expect(summarize([1, 2, 2])!.mean).toBe(2); // 1.666…
  });

  it('does not mutate the input', () => {
    const input = [3, 1, 2];
    summarize(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('niceStep', () => {
  it.each([
    [0.7, 1],
    [1.3, 2],
    [2.2, 2.5],
    [3, 5],
    [7, 10],
    [4_300, 5_000],
    [11_000, 20_000],
  ])('rounds %d up to %d', (raw, nice) => {
    expect(niceStep(raw)).toBe(nice);
  });
});

describe('histogram', () => {
  it('returns no buckets for no data', () => {
    expect(histogram([])).toEqual([]);
  });

  it('uses nice, contiguous bucket boundaries that cover every value', () => {
    const buckets = histogram([12_000, 18_000, 25_000, 99_000], 10);
    expect(buckets[0]!.from).toBe(10_000);
    expect(buckets.every((b) => b.to - b.from === 10_000)).toBe(true);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(4);
    expect(buckets.at(-1)!.from).toBeLessThanOrEqual(99_000);
    expect(buckets.at(-1)!.to).toBeGreaterThan(99_000);
  });

  it('places a value equal to a boundary in the upper bucket', () => {
    const buckets = histogram([0, 10, 20], 2);
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1]);
  });

  it('handles all-identical values with a single bucket', () => {
    expect(histogram([500, 500, 500])).toEqual([{ from: 500, to: 501, count: 3 }]);
  });
});
