# Salary Management — Requirements (one page)

## Goal
Replace ACME's spreadsheet-based salary process with a web application that lets the **HR Manager** (a) maintain salary data for ~10,000 employees across multiple countries, and (b) answer questions about how the organization pays people — quickly and without building pivot tables.

## Who & what problem
- **User:** a single persona, the HR Manager. Comfortable with Excel; not technical.
- **Pain today:** data is scattered across spreadsheets, edits are error-prone, there is no history of salary changes, and comparing pay across countries/currencies is manual.
- **Success looks like:** the HR Manager can find any employee in seconds, change a salary with confidence (validated, audited), and answer "what do we pay a *Senior Software Engineer* in *India* vs *Germany*?" in a couple of clicks.

## In scope (MVP)
| # | Feature | Why it matters |
|---|---------|----------------|
| 1 | **Employee directory** — server-side search (name/email), filter (country, department, job title), sort (name, salary, hire date), pagination | 10k rows is too many to scroll; must be instant |
| 2 | **Create / edit / delete employee** with validation (required fields, positive salary, valid country) | Core "manage" job; replaces direct spreadsheet edits |
| 3 | **Salary stored in local currency**; currency is derived from country | Matches how people are actually paid and contracted |
| 4 | **Salary change history** — every salary change is recorded automatically (old → new, date) | Spreadsheets lose this; HR is asked "when was X's last raise?" |
| 5 | **Pay insights** — org-wide KPIs (headcount, payroll, median pay) and a breakdown by **country, department, or job title**, optionally scoped to one country: headcount, min, P25, median, P75, max, mean | Directly answers "how does the org pay people?" |
| 6 | **Currency-aware comparisons** — figures are shown in local currency when a group is single-currency, and normalized to USD (with a fixed reference rate table) when comparing across countries | Mixing INR and USD in an average is meaningless; this avoids silent errors |
| 7 | **Pay distribution** histogram (USD-normalized, filterable by country) | Shows shape/outliers, not just averages |
| 8 | **Seed script** creating 10,000 realistic, deterministic employees | Required; deterministic so demos and tests are reproducible |

## Deliberately left out (and why)
| Left out | Reasoning |
|----------|-----------|
| **Authentication / roles** | Single persona for the MVP; a real rollout would put this behind company SSO rather than build bespoke login. Called out as the #1 pre-production item. |
| **Live FX rates** | Introduces an external dependency and makes numbers drift day to day. A versioned, fixed reference-rate table gives stable, explainable comparisons; swapping in a rates feed later is isolated to one module. |
| **Payroll processing, taxes, bonuses, equity, benefits** | Different problem (payroll), heavy country-specific rules. MVP covers base annual salary only. |
| **Bulk import/export (CSV/Excel)** | Valuable for migration, but the seed script stands in for the initial load; next feature on the roadmap. |
| **Gender/diversity pay-gap analysis** | Highly sensitive data with legal/governance requirements (consent, access control). Should not ship before auth & auditing exist. |
| **Approval workflows for salary changes** | Requires multiple personas (manager, finance). History gives auditability now; workflow can be layered on later. |
| **Org hierarchy / reporting lines, performance data** | Not needed to answer pay questions; adds data the HR team doesn't currently maintain. |
| **Multi-tenant, horizontal scaling** | One org, 10k rows. SQLite handles this with millisecond queries; the repository layer keeps a move to Postgres cheap. |

## Assumptions
- Salary = **annual gross base salary**, whole units of the local currency.
- One country per employee; country determines currency.
- Exchange rates are reference rates for comparison only, not for payment.

## Non-functional
- Directory and insight queries respond in < 200 ms for 10k employees.
- Fast, deterministic automated tests (in-memory DB, seeded PRNG).
- Single deployable unit (API serves the built UI).
