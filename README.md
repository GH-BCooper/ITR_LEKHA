# Lekha — your ITR assistant

Lekha compares the FY 2025-26 old and new tax regimes for a salaried Indian taxpayer, showing every calculation line and the deduction amount at which the old regime would start to win. It also reconciles Form 16 and AIS against the income you plan to declare, so mismatches surface before a notice does. It is intentionally a calculation and checking aid, not an e-filing product.

![Lekha regime comparison](./docs/lekha-ledger.png)

## Run locally (five minutes)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No account, environment file, API key, database, or network call is required for the three core engines.

## Deploy to Vercel (five minutes)

1. Push this repository to GitHub or import the folder in the Vercel dashboard.
2. Select the repository; Vercel detects Next.js automatically.
3. Leave build settings at their defaults (`npm run build`) and deploy.
4. Optionally add `OPENAI_API_KEY` (and `OPENAI_MODEL`, default `gpt-4o-mini`) to enable AI narration of the explanation. Calculated values never use it.

## Architecture

- `data/tax-rules/fy-2025-26.json` is the single versioned source for rates, caps, slabs, thresholds and tolerances.
- `lib/tax` is pure deterministic TypeScript for regime comparison and break-even calculation.
- `lib/reconcile` is pure deterministic TypeScript, one detector per flag type.
- `lib/explain` holds the rule-based explainer (default) and the optional LLM narration layer.
- `app` and `components` render the local, shareable web experience. Plain CSS in `app/globals.css` follows the system light or dark theme.

### Deterministic versus optional LLM

Every rupee value, tax comparison, deduction cap, flag and risk score is deterministic local TypeScript. The explanation under the ledger is written by `lib/explain/ruleBased.ts` from the computed result.

When `OPENAI_API_KEY` is set, **Explain in plain English** sends that fact sheet (text only, no raw inputs) to `/api/explain`, which asks the model to rephrase it. `lib/explain/llm.ts` then rejects any reply containing a number that does not appear in the facts and falls back to the rule-based text. The model never computes, adjusts or checks a figure, and the app is complete without a key.

## Limitations

Lekha deliberately does not parse real Form 16/AIS PDFs: layouts vary and silent extraction mistakes are unacceptable in a tax tool. Enter structured JSON instead. It does not cover business/professional income, foreign income or assets, crypto/VDA, clubbing, presumptive taxation, revised/belated-return rules, advance-tax interest, e-filing or user accounts. Judgement calls where the law or spec is unsettled (87A relief with capital gains, the 80G limit base) are listed on the Methodology page and in `DISCREPANCIES.md`.

## 90-second demo

1. On the landing page, load Priya. The result card shows the old regime saving ₹16,640.
2. Click any ledger row to see its working, then drag the "What if you claimed more deductions?" slider.
3. Press **Explain in plain English**.
4. Open **Check Form 16 & AIS** and load both samples: 4 blockers, 2 warnings and a claimable ₹7,740 TDS credit.
5. Press **Use AIS amounts**; blockers drop to 1. Then **Compare regimes with these figures**.

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e        # E2E_PORT=3100 to use another port
```

> Lekha computes income tax from the figures you enter, using the slab rates and rules for FY 2025-26 (AY 2026-27). It is a calculation and checking aid, not tax advice, and it does not file anything. Rules change and individual situations vary — confirm anything material with a qualified chartered accountant before you file.
