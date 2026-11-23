/**
 * Fixed reference exchange rates used ONLY to compare pay across countries.
 *
 * Why fixed rather than live: reports must be reproducible and explainable
 * ("why did the median change overnight?"). The version string is surfaced in
 * the API/UI so readers know which rate table a number was computed with.
 */
export const FX_RATES_VERSION = '2026-11 reference';

/** USD value of one unit of each currency. */
export const USD_PER_UNIT: Readonly<Record<string, number>> = {
  USD: 1,
  INR: 0.0115,
  GBP: 1.27,
  EUR: 1.08,
  CAD: 0.72,
  SGD: 0.75,
  AUD: 0.65,
  JPY: 0.0066,
  BRL: 0.18,
};

export function usdRate(currency: string): number {
  const rate = USD_PER_UNIT[currency];
  if (rate === undefined) {
    throw new Error(`No reference exchange rate for currency "${currency}"`);
  }
  return rate;
}

/** Converts an amount in `currency` to whole US dollars. */
export function toUsd(amount: number, currency: string): number {
  return Math.round(amount * usdRate(currency));
}
