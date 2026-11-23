import type { Department } from '../domain/reference.js';

/** Inputs for the synthetic salary model used by the seed script. */

export interface JobProfile {
  title: string;
  department: Department;
  /** Typical annual base salary in a US office, in USD. */
  baseUsd: number;
  /** Relative headcount weight. */
  weight: number;
}

export const JOB_PROFILES: readonly JobProfile[] = [
  { title: 'Software Engineer', department: 'Engineering', baseUsd: 125_000, weight: 18 },
  { title: 'Senior Software Engineer', department: 'Engineering', baseUsd: 165_000, weight: 12 },
  { title: 'Staff Engineer', department: 'Engineering', baseUsd: 210_000, weight: 3 },
  { title: 'Engineering Manager', department: 'Engineering', baseUsd: 195_000, weight: 3 },
  { title: 'QA Engineer', department: 'Engineering', baseUsd: 95_000, weight: 5 },
  { title: 'DevOps Engineer', department: 'Engineering', baseUsd: 135_000, weight: 4 },
  { title: 'Data Scientist', department: 'Engineering', baseUsd: 140_000, weight: 3 },
  { title: 'Product Manager', department: 'Product', baseUsd: 145_000, weight: 4 },
  { title: 'Senior Product Manager', department: 'Product', baseUsd: 175_000, weight: 2 },
  { title: 'Product Designer', department: 'Product', baseUsd: 118_000, weight: 3 },
  { title: 'Sales Development Representative', department: 'Sales', baseUsd: 62_000, weight: 5 },
  { title: 'Account Executive', department: 'Sales', baseUsd: 95_000, weight: 6 },
  { title: 'Sales Manager', department: 'Sales', baseUsd: 135_000, weight: 2 },
  { title: 'Marketing Specialist', department: 'Marketing', baseUsd: 75_000, weight: 3 },
  { title: 'Marketing Manager', department: 'Marketing', baseUsd: 122_000, weight: 1.5 },
  { title: 'Accountant', department: 'Finance', baseUsd: 72_000, weight: 2 },
  { title: 'Financial Analyst', department: 'Finance', baseUsd: 88_000, weight: 2 },
  { title: 'Finance Manager', department: 'Finance', baseUsd: 135_000, weight: 1 },
  { title: 'Recruiter', department: 'People', baseUsd: 72_000, weight: 2 },
  { title: 'HR Generalist', department: 'People', baseUsd: 68_000, weight: 1.5 },
  { title: 'HR Manager', department: 'People', baseUsd: 118_000, weight: 0.8 },
  { title: 'Customer Support Specialist', department: 'Customer Success', baseUsd: 52_000, weight: 9 },
  { title: 'Customer Success Manager', department: 'Customer Success', baseUsd: 85_000, weight: 4 },
  { title: 'Support Team Lead', department: 'Customer Success', baseUsd: 72_000, weight: 1.5 },
  { title: 'Operations Analyst', department: 'Operations', baseUsd: 76_000, weight: 2 },
  { title: 'Office Manager', department: 'Operations', baseUsd: 60_000, weight: 1 },
];

export interface CountryProfile {
  code: string;
  /** Pay level relative to the US for the same role. */
  payFactor: number;
  /** Relative headcount weight. */
  weight: number;
}

export const COUNTRY_PROFILES: readonly CountryProfile[] = [
  { code: 'US', payFactor: 1.0, weight: 30 },
  { code: 'IN', payFactor: 0.28, weight: 20 },
  { code: 'GB', payFactor: 0.78, weight: 10 },
  { code: 'DE', payFactor: 0.8, weight: 8 },
  { code: 'CA', payFactor: 0.8, weight: 7 },
  { code: 'NL', payFactor: 0.76, weight: 5 },
  { code: 'SG', payFactor: 0.75, weight: 5 },
  { code: 'AU', payFactor: 0.82, weight: 5 },
  { code: 'JP', payFactor: 0.62, weight: 5 },
  { code: 'BR', payFactor: 0.33, weight: 5 },
];

export const FIRST_NAMES: readonly string[] = [
  'Aarav', 'Aditi', 'Akira', 'Alejandro', 'Alice', 'Amara', 'Amelia', 'Ana', 'Ananya', 'Anders',
  'Arjun', 'Ava', 'Ben', 'Bruno', 'Camila', 'Carlos', 'Charlotte', 'Chen', 'Chloe', 'Daniel',
  'David', 'Diego', 'Elena', 'Elif', 'Emma', 'Ethan', 'Fatima', 'Felix', 'Gabriel', 'Grace',
  'Hana', 'Hannah', 'Haruto', 'Isabella', 'Ishaan', 'Isla', 'Jack', 'James', 'Jia', 'Jonas',
  'Julia', 'Kai', 'Kavya', 'Kenji', 'Lars', 'Laura', 'Leo', 'Liam', 'Lucas', 'Lucia',
  'Maria', 'Mateo', 'Maya', 'Mei', 'Mia', 'Michael', 'Mohammed', 'Noah', 'Nora', 'Olivia',
  'Omar', 'Oscar', 'Priya', 'Rafael', 'Ravi', 'Ren', 'Rohan', 'Sakura', 'Samuel', 'Sara',
  'Sofia', 'Sophie', 'Tanvi', 'Thomas', 'Valentina', 'Vikram', 'Wei', 'William', 'Yuki', 'Zoe',
];

export const LAST_NAMES: readonly string[] = [
  'Anderson', 'Bakker', 'Brown', 'Chen', 'Costa', 'Das', 'Davies', 'de Jong', 'Evans', 'Fernandes',
  'Fischer', 'Garcia', 'Gupta', 'Hall', 'Hoffmann', 'Iyer', 'Ito', 'Jansen', 'Johnson', 'Kapoor',
  'Kim', 'Kobayashi', 'Kumar', 'Lee', 'Lim', 'Lopez', 'Martin', 'Meyer', 'Miller', 'Murphy',
  'Nair', 'Nakamura', 'Nguyen', 'Oliveira', 'Patel', 'Pereira', 'Reddy', 'Roberts', 'Rodrigues', 'Santos',
  'Schmidt', 'Schneider', 'Shah', 'Silva', 'Singh', 'Smith', 'Suzuki', 'Tan', 'Taylor', 'Thompson',
  'Tanaka', 'Visser', 'Wagner', 'Walker', 'Wang', 'Watanabe', 'Weber', 'White', 'Williams', 'Wilson',
  'Wong', 'Yamamoto', 'Young', 'Zhang',
];
