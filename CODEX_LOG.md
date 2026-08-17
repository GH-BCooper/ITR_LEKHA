# Engineering log

## Milestone 1 — Foundation and tax-rule data
**Planned:** Establish a strict, testable Next.js project with versioned rules and docs.
**Built:** Project tooling, JSON rule source, templates, sample Form 16/AIS data, repo conventions and plan.
**Verified:** `npm run typecheck` passed; `npm run lint` passed; `npm test` passed after the deterministic tests were added.
**Self-review findings:** npm PowerShell execution policy blocks `npm`; `npm.cmd` is the Windows-compatible equivalent used for verification.
**Deferred:** None from foundation.
**Open questions:** Break-even wording contradiction is in `DISCREPANCIES.md`.

## Milestone 2 — Deterministic tax engines
**Planned:** Implement the 18-step computation and break-even engine with high coverage.
**Built:** Pure tax modules for slabs, HRA, deductions, house property, gains, rebates, surcharge, rounding and break-even.
**Verified:** `npm run typecheck`, `npm run lint` and `npm test` pass. Tax line coverage is 100%.
**Self-review findings:** The ₹12.80L marginal-relief golden case is asserted at ₹5,200; surcharge boundary testing allows the mandated final ₹10 rounding.
**Deferred:** UI integration is delivered in later milestones.
**Open questions:** See discrepancy log.

## Milestone 3 — Reconciliation engine and application surface
**Planned:** Add deterministic detectors, responsive pages and exports.
**Built:** All named detectors, transparent risk score, sample reconciliation UI, ledger, comparison wizard, methodology, error routes and downloads.
**Verified:** `npm run typecheck`, `npm run lint`, `npm test` (99.35% combined deterministic-core line coverage) and `npm run build` pass.
**Self-review findings:** Production build required a Suspense boundary around URL search parameters; it was added.
**Deferred:** Final browser E2E execution and screenshot artifact generation.
**Open questions:** None beyond documented discrepancies.

## Milestone 4 — Browser verification and delivery assets
**Planned:** Verify routes and interaction flows in a real browser, then provide the README visual and delivery instructions.
**Built:** Playwright smoke and no-dead-UI checks, plus a screenshot generated from the live landing page.
**Verified:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` all pass. The E2E suite ran three tests successfully.
**Self-review findings:** The screenshot is captured from the actual local app, not a mock; the development server was stopped after capture.
**Deferred:** None.
**Open questions:** None beyond documented discrepancies.
