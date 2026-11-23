# How AI was used

This solution was built with **Claude Code** (an agentic coding tool) as a pair programmer. The aim was to use it for speed while keeping engineering judgement — scope, design, and verification — explicit and human-owned.

## Workflow

1. **Requirements first.** The assessment brief was given to the agent, which drafted a one-page requirements doc (`docs/REQUIREMENTS.md`) — goal, in-scope features, and an explicit *left out & why* table — and committed it before any code.
2. **Stack decision made by the human.** The agent asked which backend stack matched the role rather than guessing; Node + TypeScript was chosen.
3. **Build in vertical, tested slices**, one commit each: domain helpers → schema & seed → employee service → insights service → HTTP API → UI → fixes → deploy config → docs. Tests were written alongside each slice and run before every commit.
4. **Verify in the real app, not just tests.** The production build was run locally against the seeded 10k-row database, endpoints were timed with `curl`, and the UI was driven in a browser (directory, drawer, editing a salary, insights by country / job title, mobile width).

## Representative prompts

- *"Here is the assessment brief. Build employee salary management software for a 10k-employee, multi-country org. Start with a one-page requirements doc, then build incrementally with commits."*
- *"Which statistics actually answer 'how does the org pay people'? Avoid averaging across currencies."* → led to the single-currency/USD rule and medians + quartiles instead of only averages.
- *"Make the seed deterministic and validate generated records against the API schema in a test."*
- *"Check the UI at desktop and mobile widths and fix anything that looks off."*

## Where AI output was corrected or steered

| Issue | How it was caught | Resolution |
|---|---|---|
| `better-sqlite3` failed to install (native build needs Python/C++ on Windows) | `npm install` error log | Switched to Node's built-in `node:sqlite`; documented in DECISIONS #2 |
| TypeScript parameter properties rejected by the client's `erasableSyntaxOnly` setting | Typecheck | Rewrote `ApiError` with explicit fields |
| Deleting an employee would refetch the now-deleted record and flash a 404 | Code review of cache invalidation | Remove the detail query instead of invalidating it |
| Theme toggle rendered both sun and moon icons | Visual check in the browser | Choose the icon from the computed color scheme |
| Toast notifications covered the drawer's close button | Visual check in the browser | Moved toasts to bottom-right |
| 1.2 MB initial JS bundle | Build output warning | Lazy-loaded the insights page (charts split into their own chunk) |
| A sort on raw salary would rank ₹3,000,000 above $200,000 | Designed for up front, then pinned by a test | Sort by USD equivalent |

## Guardrails used

- Every behaviour has a fast test against a real in-memory SQLite DB; no mocks of the database.
- Each change was checked with typecheck + full test suite before committing.
- Generated code was read before being committed; numbers quoted in the docs (timings, row counts) were measured, not assumed.
