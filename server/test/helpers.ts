import { fixedClock } from '../src/clock.js';
import { type Database, openDatabase } from '../src/db/database.js';
import type { EmployeeInput } from '../src/domain/employee.js';
import { createApp } from '../src/http/app.js';
import { EmployeeService } from '../src/services/employeeService.js';

export const TEST_NOW = '2026-06-15T10:00:00.000Z';
export const testClock = fixedClock(TEST_NOW);

let emailCounter = 0;

/** Valid employee input; override only what a test cares about. */
export function anEmployee(overrides: Partial<EmployeeInput> = {}): EmployeeInput {
  emailCounter += 1;
  return {
    fullName: 'Ada Lovelace',
    email: `person${emailCounter}@acme.example`,
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode: 'US',
    salary: 100_000,
    hireDate: '2022-03-01',
    ...overrides,
  };
}

export function testDb(): Database {
  return openDatabase(':memory:');
}

export function testService(db = testDb()) {
  return { db, service: new EmployeeService(db, testClock) };
}

export function testApp(db = testDb()) {
  return { db, app: createApp({ db, clock: testClock }) };
}
