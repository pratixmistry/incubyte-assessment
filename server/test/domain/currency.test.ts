import { describe, expect, it } from 'vitest';
import { toUsd, USD_PER_UNIT } from '../../src/domain/currency.js';
import { COUNTRIES } from '../../src/domain/reference.js';

describe('toUsd', () => {
  it('leaves USD unchanged', () => {
    expect(toUsd(100_000, 'USD')).toBe(100_000);
  });

  it('converts using the reference rate and rounds to whole dollars', () => {
    expect(toUsd(1_000, 'GBP')).toBe(1_270);
    expect(toUsd(1_000_001, 'JPY')).toBe(6_600);
  });

  it('throws for a currency without a reference rate rather than silently returning 0', () => {
    expect(() => toUsd(1, 'XYZ')).toThrow(/XYZ/);
  });

  it('has a rate for every country currency', () => {
    for (const country of COUNTRIES) {
      expect(USD_PER_UNIT[country.currency], country.code).toBeGreaterThan(0);
    }
  });
});
