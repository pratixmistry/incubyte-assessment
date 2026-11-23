import { beforeEach, describe, expect, it } from 'vitest';
import { InsightsService } from '../../src/services/insightsService.js';
import { anEmployee, testService } from '../helpers.js';

describe('InsightsService', () => {
  let insights: InsightsService;

  beforeEach(() => {
    const { db, service } = testService();
    insights = new InsightsService(db);
    // US engineers: 100k, 120k, 140k USD
    service.create(anEmployee({ countryCode: 'US', salary: 100_000 }));
    service.create(anEmployee({ countryCode: 'US', salary: 120_000 }));
    service.create(anEmployee({ countryCode: 'US', salary: 140_000, department: 'Product', jobTitle: 'Product Manager' }));
    // India engineer: 4,000,000 INR = 46,000 USD
    service.create(anEmployee({ countryCode: 'IN', salary: 4_000_000 }));
  });

  describe('summary', () => {
    it('normalises to USD across countries', () => {
      expect(insights.summary()).toMatchObject({
        headcount: 4,
        countries: 2,
        departments: 2,
        currency: 'USD',
        totalPayrollUsd: 406_000,
        medianUsd: 110_000,
        stats: { min: 46_000, max: 140_000, median: 110_000 },
      });
    });

    it('uses local currency when scoped to one country', () => {
      expect(insights.summary('IN')).toMatchObject({
        headcount: 1,
        currency: 'INR',
        stats: { median: 4_000_000 },
        medianUsd: 46_000,
      });
    });

    it('reports zero headcount without stats for an empty set', () => {
      const summary = insights.summary('JP');
      expect(summary.headcount).toBe(0);
      expect(summary.stats).toBeUndefined();
    });
  });

  describe('breakdown', () => {
    it('by country: each group in its own currency, ordered by USD median', () => {
      const { rows } = insights.breakdown('country');

      expect(rows.map((r) => [r.key, r.currency, r.stats.median, r.medianUsd])).toEqual([
        ['US', 'USD', 120_000, 120_000],
        ['IN', 'INR', 4_000_000, 46_000],
      ]);
      expect(rows[0]!.headcountShare).toBe(0.75);
    });

    it('by job title across countries: mixed currencies are normalised to USD', () => {
      const engineers = insights.breakdown('jobTitle').rows.find((r) => r.key === 'Software Engineer')!;

      expect(engineers).toMatchObject({
        headcount: 3,
        currency: 'USD',
        stats: { min: 46_000, median: 100_000, max: 120_000 },
      });
    });

    it('by department within one country', () => {
      const { rows, country } = insights.breakdown('department', 'US');

      expect(country).toBe('US');
      expect(rows.map((r) => [r.key, r.headcount, r.stats.median])).toEqual([
        ['Product', 1, 140_000],
        ['Engineering', 2, 110_000],
      ]);
    });
  });

  describe('distribution', () => {
    it('buckets every employee, in USD across countries', () => {
      const { currency, buckets } = insights.distribution();
      expect(currency).toBe('USD');
      expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(4);
    });

    it('uses local currency for a single country', () => {
      expect(insights.distribution('IN').currency).toBe('INR');
    });
  });
});
