/** Injected source of "now" so behaviour that depends on dates is testable. */
export interface Clock {
  /** ISO-8601 timestamp. */
  now(): string;
  /** YYYY-MM-DD (UTC). */
  today(): string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().slice(0, 10),
};

export function fixedClock(isoTimestamp: string): Clock {
  return { now: () => isoTimestamp, today: () => isoTimestamp.slice(0, 10) };
}
