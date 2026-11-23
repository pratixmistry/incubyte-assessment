# Salary Manager

Web app for ACME's HR Manager to **manage salary data for 10,000 employees across 10 countries** and **answer questions about how the organisation pays people**, replacing a spreadsheet-based process.

- **Employee directory** — instant server-side search, filters (country, department, job title), sorting and pagination over 10k people; shareable URLs.
- **Manage employees** — create, edit and delete with validation; salary is held in the employee's local currency.
- **Salary history** — every salary change is recorded automatically and shown as a timeline with % change.
- **Pay insights** — headcount, payroll, median, middle-50% range; breakdown by country, department or job title (optionally within one country); salary distribution; drill-down from any number to the people behind it. Currency-aware: local currency where it makes sense, USD-normalised when comparing across countries.

| Doc | What's in it |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | One-page requirements: goal, scope, what's deliberately left out and why |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrams, layers, data model, API |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Trade-offs, performance measurements, next steps |
| [docs/AI_USAGE.md](docs/AI_USAGE.md) | How AI tools were used, prompts, and what was corrected |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Walkthrough used for the demo video |

## Tech stack

| | |
|---|---|
| Backend | Node.js 24, TypeScript, Express 5, zod, SQLite via built-in `node:sqlite` |
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui (Radix primitives, recharts charts), TanStack React Query, React Router |
| Tests | Vitest, Supertest, Testing Library |
| Delivery | Single Docker image (API serves the built UI), Render blueprint, GitHub Actions CI |

## Getting started

Requires **Node.js ≥ 22.13** (24 recommended — see `.nvmrc`).

```bash
npm install
```

```bash
npm run install:all
```

```bash
npm run seed
```

```bash
npm run dev
```

- UI: http://localhost:5173 (Vite, proxies `/api` to the server)
- API: http://localhost:3001/api

`npm run seed` (re)creates `server/data/salary.db` with 10,000 deterministic employees in ~0.3s. The server also seeds itself on boot if the database is empty.

### Production build

```bash
npm run build
```

```bash
npm start
```

Serves the API and the built UI together on http://localhost:3001.

### Tests

```bash
npm test
```

Runs 98 tests (72 server, 26 client) in a few seconds. Server tests use a fresh in-memory SQLite database per test and a fixed clock — no mocks of the database, no network, no shared state.

| Suite | Covers |
|---|---|
| `server/test/domain` | Quantiles (match Excel `PERCENTILE.INC`), summaries, histogram bucketing, FX conversion |
| `server/test/seed` | Seed is deterministic, valid per API schema, unique emails, consistent salary history, realistic pay levels |
| `server/test/services` | Salary history rules, duplicate emails, search/filter/sort/paginate, insights currency rules |
| `server/test/http` | Status codes, validation error shape, input normalisation, routing |
| `client/src/**/*.test.ts(x)` | Formatting, URL ↔ filter state, salary input parsing, form validation and server-error display |

## Configuration

| Variable | Default | |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `DB_PATH` | `server/data/salary.db` | SQLite file |
| `SEED_ON_EMPTY` | `true` | Seed 10k employees on boot if the DB is empty |
| `CLIENT_DIST` | `client/dist` | Built UI to serve (if present) |
| `SEED_COUNT` | `10000` | Employees created by `npm run seed` |

## Deployment

The `Dockerfile` builds one image that serves the UI and API:

```bash
docker build -t salary-manager .
```

```bash
docker run -p 3001:3001 -v salary-data:/data salary-manager
```

**Render:** connect the repository and create a Blueprint — `render.yaml` defines a free Docker web service with a health check. Free instances have an ephemeral disk, so the app re-seeds 10,000 employees on each cold start; attach a disk at `/data` to persist edits.

## Project structure

```
client/                React SPA
  src/api/             fetch client, React Query hooks, DTO types
  src/components/      Layout, EmployeeForm, EmployeeDrawer, Combobox (+ ui/ = shadcn primitives)
  src/pages/           EmployeesPage, InsightsPage
  src/lib/             formatting, URL query state, validation (pure, tested)
server/
  src/domain/          pure logic: stats, currency, reference data, zod schemas
  src/db/              connection, schema, transactions
  src/repositories/    SQL
  src/services/        business rules (employees, insights)
  src/http/            Express app, routes, error mapping
  src/seed/            deterministic generator + seeder + CLI
  test/                unit, service and HTTP contract tests
docs/                  requirements, architecture, decisions, AI usage, demo script
```
