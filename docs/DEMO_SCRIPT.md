# Demo video script (~4 minutes)

A suggested flow for the screen recording. Start with `npm run seed && npm run build && npm start` and open http://localhost:3001 (or the deployed URL).

1. **Context (20s)** — "ACME's HR manager runs salaries for 10,000 people in 10 countries out of spreadsheets. This app replaces that." Show `docs/REQUIREMENTS.md` briefly — scope and what's deliberately left out.
2. **Find people fast (45s)** — Employees page: 10,000 total. Search "patel"; filter Country = India, Job title = Software Engineer. Sort by salary (note: sorts by USD equivalent across currencies). Copy the URL — filters live in the URL so views can be shared.
3. **Change a salary (45s)** — Open an employee: details, local salary + USD equivalent, salary history timeline. Edit → raise salary → Save. The new raise appears at the top of the history with the % change.
4. **Validation (20s)** — Add employee with an existing email → inline "already exists" error from the server. Show required-field errors.
5. **How do we pay people? (60s)** — Pay insights: headcount, median, middle-50% range, payroll. Pay by country — each country in its own currency, chart compares medians in USD. Switch to Job title. Scope to Germany → everything switches to EUR. Click a row to drill into the employees behind the number. Show the distribution chart.
6. **Engineering (40s)** — Repo tour: layered server (domain → repository → service → HTTP), `npm test` (≈90 fast tests), commit history, `docs/DECISIONS.md`, `docs/AI_USAGE.md`.
