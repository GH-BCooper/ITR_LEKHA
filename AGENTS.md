# Lekha repository conventions

- Keep tax rates, thresholds, caps and tolerances in `data/tax-rules/fy-2025-26.json`; update its FY, AY, source note and verification date for a new year.
- Add a deduction by adding its rule data, a transparent line in `lib/tax/deductions.ts`, input support, ledger display and unit tests.
- Add a reconciliation detector as a separate `lib/reconcile/detectors/*.ts` function, wire it through `reconcile.ts`, and provide positive, clean and exact-tolerance tests.
- Use integer rupees throughout the deterministic core. Only `round10()` performs statutory rounding.
- Required gates: `npm run typecheck`, `npm run lint`, `npm test`, then `npm run build`; use `npm run test:e2e` before a release.
- No dead UI: every interactive element needs a visible result. Never use empty links, no-op handlers, permanent disabled controls or nonexistent routes.
