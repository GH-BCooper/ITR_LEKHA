# Lekha build plan

This plan follows `LEKHA_SPEC.md` as the authoritative source. Milestone gates are
run after every milestone: `npm run typecheck`, `npm run lint`, and `npm test`.

## Milestone 1 — Foundation and tax-rule data

**Acceptance criteria**

- Next.js App Router project starts without environment variables.
- Strict TypeScript, Tailwind, Vitest, Playwright, linting and coverage commands exist.
- All FY 2025-26 rates, caps, thresholds and tolerances are versioned in
  `data/tax-rules/fy-2025-26.json`; tax TypeScript contains no tax-rule literals.
- Required repository documentation and sample/template JSON are present.

**Files**

- Tooling: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
  `tailwind.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`.
- Data: `data/tax-rules/fy-2025-26.json`, `data/samples/*`, `data/templates/*`.
- Documentation: `AGENTS.md`, `README.md`, `CODEX_LOG.md`, `DISCREPANCIES.md`,
  `.env.example`, `LICENSE`.

## Milestone 2 — Deterministic tax engines

**Acceptance criteria**

- Pure tax computation implements the prescribed 18-step order for both regimes.
- HRA, house property, deductions, special capital gains, rebates, both marginal
  relief mechanisms, surcharge, cess and rounding are covered.
- Break-even finder uses ₹100 binary search and exposes all required result fields.
- Golden and edge-case/property tests pass at 90%+ coverage for `lib/tax`.

**Files**

- `lib/tax/{types,round,slabs,hra,houseProperty,capitalGains,deductions,rebate,surcharge,compute,breakEven}.ts`
- `lib/format/inr.ts`, `lib/validation/schemas.ts`
- `tests/tax/*.test.ts`

## Milestone 3 — Deterministic reconciliation engine

**Acceptance criteria**

- Form 16 and AIS input schemas validate structured JSON.
- Every named flag detector exists, has positive/negative/boundary coverage, and
  duplicate AIS records are excluded from undeclared income.
- Transparent risk score and its line items are computed deterministically.
- `lib/reconcile` reaches 90%+ line coverage.

**Files**

- `lib/reconcile/types.ts`, `lib/reconcile/reconcile.ts`, `lib/reconcile/riskScore.ts`
- `lib/reconcile/detectors/*.ts`, `tests/reconcile/*.test.ts`

## Milestone 4 — Comparison experience

**Acceptance criteria**

- Landing and compare pages load all three personas and retain state in URL params.
- Accessible, validated three-step input flow, running summary, signature ledger,
  18-step detailed breakdown, explanations, export and reset work.
- Break-even slider is mouse, touch and keyboard usable with numeric alternative.
- Ledger is responsive at 360px and displays disallowed deductions visibly.

**Files**

- `app/{layout,page,compare/page,globals.css}.tsx`
- `components/{ledger,inputs,ui}/*`, `lib/explain/*`

## Milestone 5 — Reconciliation and trust experience

**Acceptance criteria**

- Reconcile page supports samples, paste, upload, templates, malformed-file errors,
  document swap, flags, risk-score working and copied checklist.
- Methodology reads the shared tax JSON and documents limitations.
- Error and not-found pages are useful, all results show the verbatim disclaimer,
  optional explanation endpoint degrades without an API key.

**Files**

- `app/{reconcile,methodology,api/explain}/...`, `app/{error,not-found}.tsx`
- `components/flags/*`

## Milestone 6 — E2E, review and delivery verification

**Acceptance criteria**

- Smoke and no-dead-UI Playwright suites pass.
- Build passes and the README has setup, deployment and 90-second demo instructions.
- Final review checks every Definition of Done item that is objectively testable.

**Files**

- `tests/e2e/{smoke,no-dead-ui}.spec.ts`, final documentation updates.

## Open questions

1. The spec says tax-rule figures must not appear in TypeScript, yet its required
   code example includes a ₹12L marginal-relief threshold. The implementation will
   use the JSON rule value instead.
2. The given surcharge golden case calculates surcharge from slab tax only while
   the general rule says total tax. In the specified case there is no special-rate
   income, so both interpretations have the same result.
3. For break-even, “deductions + exemptions” is modelled as an additional old
   regime reduction after fixed income components; the user’s actual HRA is still
   included in current deductions and realistic ceiling, preserving the stated
   behaviour.
