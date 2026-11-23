# Design decisions, trade-offs & performance

Each entry: what was decided, why, and what we gave up.

## 1. Stack: Node + TypeScript, Express, SQLite, React + Mantine
- **Why:** one language end to end; types shared conceptually between API DTOs and the client; SQLite is the brief's suggestion and is more than enough for 10k rows.
- **Gave up:** a multi-user production database. The repository layer is the only place with SQL, so moving to Postgres is contained (the only SQLite-specific bits are `COLLATE NOCASE` and the driver API).

## 2. `node:sqlite` instead of `better-sqlite3`
- **Context:** `better-sqlite3` had no prebuilt binary for this Node version on Windows and fell back to a native compile that needs Python + a C++ toolchain.
- **Decision:** use the SQLite driver built into Node (≥ 22.13). Zero native dependencies → `npm install` and Docker builds "just work".
- **Trade-off:** it's flagged *experimental* in Node 24 (we silence the warning with `--disable-warning=ExperimentalWarning`). The API is a near drop-in for better-sqlite3 and isolated to `db/` + repositories, so switching back is ~1 file of changes.

## 3. Salaries stored in local currency; USD only for comparison
- HR thinks and contracts in local currency, so that is the source of truth (`INTEGER`, whole units — no float rounding drift).
- **Currency rule for statistics:** if a group is single-currency, show stats in that currency; if mixed, normalise to USD. `medianUsd` is always returned so any two groups can be compared. This prevents the classic spreadsheet mistake of averaging ₹ and $ together.
- Directory `sort=salary` orders by USD equivalent for the same reason (otherwise 3,000,000 INR ranks above 200,000 USD).

## 4. Fixed, versioned reference FX rates (not live)
- **Why:** reports must be reproducible ("why did the median change overnight?") and testable; no third-party dependency or API key.
- **Gave up:** day-accurate conversions. The UI labels the rate version and explains it in a tooltip. Swapping in a feed is isolated to `domain/currency.ts` + the `currencies` table.

## 5. Statistics computed in the service, not SQL
- SQLite has no `MEDIAN`/`PERCENTILE` aggregate. Options were window-function SQL (hard to read/test), a SQLite extension (deployment pain), or reading narrow rows and aggregating in TypeScript.
- **Decision:** read one narrow row per employee (`country, department, job_title, salary, currency, rate`) and aggregate with pure, unit-tested functions. Quantiles use linear interpolation — the same as Excel's `PERCENTILE.INC`, which the HR user will cross-check against.
- **Performance:** at 10k employees the breakdown endpoint answers in ~40 ms end-to-end locally (measured with curl against the seeded DB). At ~1M rows this would need pre-aggregation (materialised summary tables refreshed on write, or Postgres `percentile_cont`).

## 6. Salary history as an append-only table written by the service
- Every salary change, including the starting salary, is inserted in the **same transaction** as the update, so history can't drift from the current value.
- A country move that changes currency records `previous_salary = NULL` rather than implying a raise or cut between incomparable amounts.
- **Gave up:** effective-dated future changes and approvals (see requirements).

## 7. Server-side pagination, filtering and sorting
- Sending 10k rows to the browser works, but doesn't scale and makes the first paint slow. The server returns pages of ≤100 with a total count; filters use indexed columns.
- `ORDER BY` columns come from a whitelist map — user input is never interpolated into SQL. Search escapes `%`/`_` so they're literal.
- Measured on the 10k seed: list/search requests ~60–70 ms round-trip locally, most of which is HTTP overhead.

## 8. Validation at the boundary, shared rules
- zod schemas validate and *normalise* input (trim, lowercase email, uppercase country) before it reaches services. The seed generator's output is validated against the same schema in tests, so seeded data can't be something the API would reject.
- The client validates for instant feedback but the server is the source of truth; server field errors (e.g. duplicate email → 409) render inline in the same form fields.

## 9. Deterministic seed
- Seeded PRNG (mulberry32) + fixed reference date → the same 10,000 employees every time, so demos, screenshots and tests are reproducible. Salary = role base × country pay factor × individual variation, with 0–4 past raises reconstructed on work anniversaries. 10k employees + ~26k salary-history rows insert in ~300 ms (single transaction, prepared statements).

## 10. One deployable unit
- Express serves the built SPA and the API from the same origin: no CORS, one URL, one health check. Docker image runs as a non-root user; on hosts with ephemeral disks the server seeds itself when the DB is empty.

## Known limitations / next steps
1. **Authentication & authorisation** (company SSO) — required before real data.
2. **Audit log** of who changed what (we record *what* changed, not *who*, because there are no users yet).
3. CSV/Excel import & export — the obvious migration path off spreadsheets.
4. Optimistic concurrency (`updated_at` check) to prevent two HR users overwriting each other.
5. Pay bands per role/level and "who is outside their band" — the natural next insight.
