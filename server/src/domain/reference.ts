/**
 * Reference data for the organisation: where people work and how the
 * organisation is structured. Kept in code (not editable via the UI) because it
 * changes rarely and drives validation, seeding and currency handling.
 */

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // ISO 4217
}

export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
];

const countriesByCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string): Country | undefined {
  return countriesByCode.get(code.toUpperCase());
}

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Sales',
  'Marketing',
  'Finance',
  'People',
  'Customer Success',
  'Operations',
] as const;

export type Department = (typeof DEPARTMENTS)[number];
