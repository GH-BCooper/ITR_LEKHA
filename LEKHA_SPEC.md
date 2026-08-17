# LEKHA — Master Build Specification

> **Product:** Lekha (लेखा — "the account/ledger")
> **One line:** Tells an Indian salaried taxpayer which tax regime actually saves them money, and catches the mismatches that get people income-tax notices — before they file.
> **Audience:** Salaried individuals in India filing ITR for **FY 2025-26 (AY 2026-27)**.
> **Status of this document:** This is the complete, authoritative build spec. Build exactly this. Where this document and your instincts disagree, this document wins. Where this document is silent, ask in `QUESTIONS.md` rather than inventing scope.

---

## 0. HOW TO USE THIS DOCUMENT (read first, Codex)

You are a senior full-stack engineer building a production-quality web app in the current empty folder.

**Working protocol — mandatory, non-negotiable:**

1. **Plan first.** Before writing any application code, produce `PLANS.md` containing: milestone list, per-milestone acceptance criteria, file-level breakdown, and open questions. Do not start coding until `PLANS.md` exists.
2. **Milestone gates.** After every milestone: run `npm run typecheck`, `npm run lint`, `npm test`. All three must pass before you move to the next milestone. If they don't pass, fix before proceeding — never proceed with a failing gate and a note to fix later.
3. **Self-review loop.** Before committing each milestone, re-read the milestone's acceptance criteria in `PLANS.md` and the relevant section of this spec, then write a short self-review in `CODEX_LOG.md`: what you built, what you verified, what you deliberately deferred, what you're unsure about.
4. **Small commits.** One logical change per commit. Conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
5. **Parallelise reads, serialise writes.** Read many files at once when exploring. Write carefully, one concern at a time.
6. **Effort allocation.** High effort on `lib/tax/*` and `lib/reconcile/*` (correctness is the whole product). Medium effort on UI components. Low effort on config/boilerplate.
7. **Never fake it.** If something doesn't work, it does not ship. No placeholder buttons, no "coming soon", no fake data pretending to be real, no stubbed handlers.
8. **Question the spec if it's wrong.** If a rule in Section 3 appears to contradict itself or produce absurd output, do NOT silently "fix" it. Log it in `DISCREPANCIES.md` with your reasoning and implement the spec as written, flagged with a `// SPEC-DISCREPANCY:` comment.

**Human context:** The person commissioning this will need to read, understand, explain and defend every line of this codebase. Optimise for **legibility over cleverness**. Prefer an obvious 20-line function over a clever 6-line one. Comment the *why*, especially in tax logic. No metaprogramming, no exotic type gymnastics, no clever abstractions that save 10 lines and cost an hour of understanding.

---

## 1. WHAT THIS PRODUCT DOES

Three engines, one product. All three must fully work.

### Engine 1 — Regime Optimiser
Take a taxpayer's income and deduction inputs. Compute final tax liability under **both** the old regime and the new regime, correctly, including rebate, marginal relief, surcharge, surcharge marginal relief, and cess. Show which is cheaper and by how much, with a full line-by-line working that a human can audit.

### Engine 2 — Break-Even Deduction Finder
The genuinely useful, non-obvious output: given this person's income, compute the **exact rupee amount of old-regime deductions** at which the old regime starts beating the new regime. Then compare against what they've actually claimed.

This answers the question everyone actually has — *"is it even worth me doing 80C paperwork this year?"* — and almost no consumer tool answers it directly. This is the product's differentiator. Build it properly.

### Engine 3 — Return Sanity Check (Form 16 vs AIS reconciliation)
Take what the employer reported (Form 16) and what the tax department already knows (AIS / 26AS), compare them, and flag every discrepancy with a severity, a plain-English explanation of what it means, and what to do about it.

This is the "why you get a notice two years later" problem. Most people have never opened their AIS.

---

## 2. HARD CONSTRAINTS

| Constraint | Rule |
| --- | --- |
| **Zero-setup demo** | `npm install && npm run dev` must produce a fully working app with **no login, no API key, no env vars, no database**. All three engines fully functional. This is non-negotiable — the demo must never depend on a network call. |
| **Deterministic core** | All tax computation and all reconciliation logic is pure, deterministic TypeScript. Zero LLM involvement in any number. An LLM must never compute, adjust, or "sanity check" a rupee figure. |
| **Optional LLM layer** | `OPENAI_API_KEY` is optional and enhances *explanations only* (plain-English narration of an already-computed result). Without it, a deterministic rule-based explainer produces good explanations. The app must be equally complete without a key. |
| **No dead UI** | Every button, link, tab, input, icon and route in the app performs a real action with a visible result. See Section 8.9 — this is enforced by a test. |
| **Not tax advice** | The app is a computation and checking aid. Every result screen carries a clear, non-alarming disclaimer. Never phrase output as "you should file X" — phrase as "based on the figures entered, the new regime computes lower by ₹X." |
| **Rates are data, not code** | Every slab, cap, rate and threshold lives in versioned JSON under `/data/tax-rules/`. No magic numbers anywhere in `.ts` files. |
| **Accessibility floor** | Keyboard navigable, visible focus rings, semantic HTML, labelled inputs, `prefers-reduced-motion` respected, colour never the sole carrier of meaning (always pair with icon + text), WCAG AA contrast. |
| **Mobile first** | Fully usable at 360px width. Test it. |

---

## 3. TAX DOMAIN RULES — FY 2025-26 (AY 2026-27)

> **Verification note for Codex:** These rules were verified against public sources as of **31 July 2026**. Budget 2026 (Feb 2026) made no changes to slabs, rates, standard deduction, 87A rebate, surcharge or cess — so FY 2026-27 uses the same structure. Store all of this in `/data/tax-rules/fy-2025-26.json` with `sourceNote` and `lastVerified` fields, and surface both in the `/methodology` page. **If your implementation disagrees with any golden test in Section 9, do not edit the test to match your code — investigate, and log it in `DISCREPANCIES.md`.**

### 3.1 New Regime slabs (default regime; same rates for all ages)

| Taxable income | Rate |
| --- | --- |
| ₹0 – ₹4,00,000 | 0% |
| ₹4,00,001 – ₹8,00,000 | 5% |
| ₹8,00,001 – ₹12,00,000 | 10% |
| ₹12,00,001 – ₹16,00,000 | 15% |
| ₹16,00,001 – ₹20,00,000 | 20% |
| ₹20,00,001 – ₹24,00,000 | 25% |
| Above ₹24,00,000 | 30% |

- **Standard deduction:** ₹75,000 (salaried and pensioners only — not for someone with no salary/pension income)
- **Age makes no difference** to slabs in the new regime.

### 3.2 Old Regime slabs (age-dependent basic exemption)

| Taxable income | Below 60 | Senior (60–79) | Super senior (80+) |
| --- | --- | --- | --- |
| Basic exemption | ₹2,50,000 | ₹3,00,000 | ₹5,00,000 |
| Next band @ 5% | up to ₹5,00,000 | up to ₹5,00,000 | — |
| Next band @ 20% | up to ₹10,00,000 | up to ₹10,00,000 | up to ₹10,00,000 |
| Above ₹10,00,000 | 30% | 30% | 30% |

- **Standard deduction:** ₹50,000 (salaried and pensioners only)
- Age is determined **at any time during the financial year** — if the person turns 60 on 31 March 2026, they are a senior citizen for FY 2025-26. Implement it this way and comment it.

### 3.3 Section 87A rebate

| | New regime | Old regime |
| --- | --- | --- |
| Taxable income ceiling | ₹12,00,000 | ₹5,00,000 |
| Max rebate | ₹60,000 | ₹12,500 |

Rules that must be implemented exactly:
- Rebate = `min(rebateCap, taxBeforeCess)`. It can never exceed tax payable.
- **Resident individuals only.** A non-resident gets zero rebate under either regime. The UI must therefore ask residency.
- Rebate applies to **slab-rate tax only**, not to income taxed at special rates (capital gains under 111A/112A, lottery under 115BB). If special-rate income is present, the rebate is computed on the slab portion of tax only. Implement this split even if the capital-gains input is minimal — the correctness matters.
- Rebate is applied **before** cess, and before surcharge (a person eligible for rebate can never be in surcharge territory anyway, but code it in the correct order regardless).

### 3.4 Marginal relief on the 87A rebate (new regime)

When taxable income crosses ₹12,00,000 in the new regime, the rebate vanishes entirely — creating a cliff where ₹1 more income costs ₹60,000+ more tax. Marginal relief prevents this.

```
if (regime === 'new' && taxableIncome > 12_00_000) {
  const excessOverThreshold = taxableIncome - 12_00_000;
  const taxAtThreshold = 0;               // tax on exactly ₹12L after rebate is nil
  const cappedTax = excessOverThreshold;  // additional tax cannot exceed additional income
  taxBeforeCess = Math.min(slabTax, cappedTax);
}
```

The relief tapers out at approximately **₹12,70,588** of taxable income. Compute the exact crossover point at runtime rather than hardcoding it, and surface it in the UI as a callout when the user lands near it — this is exactly the kind of thing people don't know.

### 3.5 Surcharge

Applied on the tax amount when **total taxable income** exceeds:

| Total income | Old regime | New regime |
| --- | --- | --- |
| > ₹50,00,000 | 10% | 10% |
| > ₹1,00,00,000 | 15% | 15% |
| > ₹2,00,00,000 | 25% | 25% |
| > ₹5,00,00,000 | 37% | **25% (capped)** |

**Surcharge marginal relief is mandatory.** At each threshold, the total of (tax + surcharge) must not increase by more than the income that crossed the threshold. Implement generically:

```
relief = max(0, (taxWithSurcharge - taxAtThreshold) - (income - threshold))
finalTaxPlusSurcharge = taxWithSurcharge - relief
```

Apply against the nearest lower threshold crossed. Test this — it's where most amateur tax calculators are wrong.

### 3.6 Health & Education Cess
**4%** on (tax after rebate + surcharge after marginal relief). Applies under both regimes. No exceptions.

### 3.7 Rounding
- Total income is rounded to the nearest ₹10 (s.288A).
- Final tax payable is rounded to the nearest ₹10 (s.288B).
- Do **not** round intermediate steps. Round only at these two points. Put both in a documented `round10()` helper and reference the section in a comment.

### 3.8 Deductions — old regime

Implement each with its own validation. `cap` is the statutory maximum.

| Section | What it is | Cap | Notes |
| --- | --- | --- | --- |
| **80C** | PF, PPF, ELSS, life insurance premium, principal on home loan, tuition fees, NSC, 5-yr FD | ₹1,50,000 | Combined 80C + 80CCC + 80CCD(1) ceiling |
| **80CCD(1B)** | Additional NPS (self) contribution | ₹50,000 | Over and above 80C |
| **80CCD(2)** | Employer's NPS contribution | 14% of (basic + DA) | **Allowed in BOTH regimes** — critical, don't miss this |
| **80D — self/family** | Health insurance premium | ₹25,000 (₹50,000 if the insured self/spouse is a senior citizen) | Includes preventive health check-up up to ₹5,000 *within* the cap |
| **80D — parents** | Health insurance for parents | ₹25,000 (₹50,000 if parents are senior citizens) | Separate limit, additive to the above |
| **80TTA** | Savings account interest | ₹10,000 | Non-senior only |
| **80TTB** | Interest on deposits (savings + FD) | ₹50,000 | Senior citizens only. **Mutually exclusive with 80TTA** — if age ≥ 60, 80TTB applies and 80TTA must be disabled in the UI |
| **24(b)** | Home loan interest — self-occupied | ₹2,00,000 | |
| **24(b)** | Home loan interest — let-out | No cap on interest | But the resulting *house property loss* set-off against other heads is capped at ₹2,00,000 per year; the remainder carries forward 8 years. Implement the ₹2L set-off cap. |
| **80E** | Education loan interest | No cap | Max 8 assessment years |
| **80G** | Donations | 50% or 100%, some with a 10%-of-adjusted-gross-income qualifying limit | Implement as: `{percent: 50|100, hasQualifyingLimit: boolean}` |
| **80DD / 80DDB / 80U** | Disability / specified illness | Varies | Implement as fixed-amount inputs with the statutory caps in the rules JSON |
| **80GG** | Rent paid when the person receives no HRA | Least of ₹5,000/month, 25% of total income, or rent − 10% of total income | Only available if HRA is nil |
| **Professional tax** | State professional tax paid | ₹2,500 | Old regime only |

**HRA exemption** (s.10(13A)) — old regime only, and it is an *exemption from salary*, not a Chapter VI-A deduction, so it must be subtracted before the standard deduction in the computation order:

```
exempt = min(
  actualHraReceived,
  rentPaid - (0.10 × salaryForHra),
  metroCity ? 0.50 × salaryForHra : 0.40 × salaryForHra
)
// salaryForHra = basic + DA (+ commission on turnover, if applicable)
// If rentPaid ≤ 10% of salaryForHra, exemption is ZERO — handle this, don't return a negative
```

Metro cities for HRA purposes: **Delhi, Mumbai, Kolkata, Chennai only.** Not Bengaluru, not Hyderabad, not Pune. Make this a dropdown, not free text, and add a tooltip explaining it — this trips up almost everyone.

### 3.9 Deductions — new regime

The new regime allows **only** these. Everything in 3.8 not listed here is disallowed:

- Standard deduction ₹75,000 (salaried/pensioner)
- **80CCD(2)** — employer NPS, up to 14% of basic+DA
- **80CCH** — Agniveer Corpus Fund contribution
- **24(b) interest on a let-out property** (self-occupied home loan interest is NOT allowed)
- Family pension deduction — ₹25,000 or ⅓ of pension, whichever is lower

The UI must not simply grey these out silently. When a user enters an 80C amount, the new-regime column must show it as **struck through with the label "not allowed in new regime"** — the loss should be visible, because that visibility *is* the insight.

### 3.10 Income heads to support

Keep scope tight but correct:

1. **Salary** — gross salary, basic, DA, HRA received, other exempt allowances (LTA etc. as a single field), employer NPS contribution
2. **House property** — self-occupied (interest only) OR let-out (rent received, municipal taxes paid, 30% standard deduction on net annual value, interest paid)
3. **Other sources** — savings interest, FD/deposit interest, dividends, family pension
4. **Capital gains** — a minimal but *correct* implementation: STCG u/s 111A @ 20%, LTCG u/s 112A @ 12.5% with a ₹1,25,000 annual exemption. These are taxed at special rates, excluded from slab tax, and excluded from the 87A rebate base.

**Do not implement:** business/professional income, foreign income, crypto/VDA, clubbing of income, presumptive taxation, carry-forward loss ledgers beyond the single house-property case. Say so explicitly in the UI and README.

### 3.11 Computation order (implement exactly this sequence)

```
1.  Gross salary
2.  − exempt allowances (HRA exemption, LTA, other s.10 exemptions)   [old regime only]
3.  = Net salary
4.  − standard deduction (₹75,000 new / ₹50,000 old)
5.  + income from house property (after 30% standard deduction & interest; loss set-off capped at ₹2L)
6.  + income from other sources
7.  = Gross Total Income (slab-rate portion)
8.  − Chapter VI-A deductions (regime-filtered)
9.  = Total taxable income (slab portion), rounded to nearest ₹10
10. Compute slab tax on the slab portion
11. Compute special-rate tax on capital gains separately (no rebate applies to this)
12. Apply 87A rebate to the slab-tax portion only
13. Apply marginal relief on the rebate (new regime, income just over ₹12L)
14. Add surcharge if applicable (on total tax, based on total income)
15. Apply surcharge marginal relief
16. Add 4% cess on (tax + surcharge)
17. Round final figure to nearest ₹10
18. − TDS already paid → refund due, or balance payable
```

Every one of these 18 steps must be individually visible in the UI's detailed breakdown, with its rupee value. That transparency is the product.

---

## 4. ENGINE 2 — BREAK-EVEN DEDUCTION FINDER (build this carefully)

**The question:** "At what level of old-regime deductions does the old regime become cheaper than the new regime, for my income?"

**Method:** Hold all income constant. Treat total old-regime Chapter VI-A deductions + exemptions as a single variable `D`. Compute `oldRegimeTax(D)` and the constant `newRegimeTax`. Find the smallest `D` where `oldRegimeTax(D) ≤ newRegimeTax`.

Implementation requirements:
- Use **binary search** over `D` in the range `[0, grossTotalIncome]`, resolving to the nearest ₹100. It's monotonic (more deductions never increase tax), so binary search is valid and fast. Comment the monotonicity assumption.
- Handle the **no-solution case**: for many incomes, especially below ~₹12.75L, the new regime wins even with maximum possible deductions. When no `D` in range produces a win, return `{ breakEvenExists: false }` and the UI must say so plainly: *"At your income, the new regime wins no matter how much you invest in deductions. Section 80C paperwork will not reduce your tax this year."* — this is the single most valuable sentence the app can produce for a young salaried person, and it is very rarely said this bluntly.
- Handle the **already-past-break-even case**: user's claimed deductions already exceed the break-even → show the surplus.
- Also compute the **realistic ceiling**: the maximum deductions this person could plausibly claim (80C ₹1.5L + 80CCD(1B) ₹50k + 80D as entered + 24(b) as entered + HRA as computed). If break-even > realistic ceiling, say so.
- Output shape:

```ts
type BreakEvenResult =
  | { breakEvenExists: false; reason: 'new-regime-always-wins'; maxOldRegimeSaving: number }
  | { breakEvenExists: true;
      breakEvenDeductions: number;
      currentDeductions: number;
      gap: number;                  // negative if already past it
      exceedsRealisticCeiling: boolean;
      realisticCeiling: number; }
```

**UI treatment:** a horizontal deduction axis from ₹0 to the realistic ceiling, with a marker at the break-even point and a marker at where the user currently stands, and the region beyond break-even shaded in the ledger green. Draggable — dragging recomputes live tax for both regimes. This is the app's signature interaction. It must be smooth (the computation is pure and fast — no debounce needed beyond a `requestAnimationFrame`), keyboard-operable via arrow keys on the slider, and it must have an accessible numeric input beside it for people who'd rather type.

---

## 5. ENGINE 3 — RETURN SANITY CHECK (Form 16 vs AIS)

### 5.1 What these documents are (encode this understanding in the UI copy)

- **Form 16** — issued by the employer. Part A: TDS deducted and deposited, quarter-wise, with the employer's TAN. Part B: salary breakup and deductions the employer considered.
- **AIS (Annual Information Statement)** — the tax department's own record of your financial year, built from reports filed by banks, employers, mutual funds, registrars. It sees things your Form 16 doesn't: savings interest, FD interest, dividends, share sales, large transactions.
- **Form 26AS** — the tax credit statement: every rupee of TDS/TCS credited against your PAN.

**The core problem:** if what you file doesn't match what AIS says, the system flags it, often automatically, often 12–24 months later. Most people never open their AIS before filing.

### 5.2 Input format

Both documents are entered as structured JSON (uploaded, pasted, or loaded from sample). **Do not attempt PDF parsing** — see Non-Goals. Provide a documented schema and a downloadable blank template so a user can fill their own.

```jsonc
// /data/samples/form16.sample.json
{
  "documentType": "FORM16",
  "assessmentYear": "2026-27",
  "pan": "ABCDE1234F",
  "employer": { "name": "Acme Systems Pvt Ltd", "tan": "BLRA12345B" },
  "salary": {
    "gross": 1450000,
    "basic": 700000,
    "da": 0,
    "hraReceived": 280000,
    "exemptAllowances": 52000,
    "employerNpsContribution": 98000
  },
  "deductionsConsidered": {
    "80C": 150000,
    "80D": 25000,
    "80CCD1B": 50000
  },
  "tdsQuarterly": [
    { "quarter": "Q1", "amount": 22000, "depositedOn": "2025-07-07" },
    { "quarter": "Q2", "amount": 22000, "depositedOn": "2025-10-07" },
    { "quarter": "Q3", "amount": 22000, "depositedOn": "2026-01-07" },
    { "quarter": "Q4", "amount": 24000, "depositedOn": "2026-04-30" }
  ],
  "totalTds": 90000
}
```

```jsonc
// /data/samples/ais.sample.json
{
  "documentType": "AIS",
  "assessmentYear": "2026-27",
  "pan": "ABCDE1234F",
  "entries": [
    { "id": "A1", "category": "SALARY",         "source": "Acme Systems Pvt Ltd", "sourceTan": "BLRA12345B", "amount": 1450000, "tdsCredited": 88000 },
    { "id": "A2", "category": "SAVINGS_INTEREST","source": "HDFC Bank",            "amount": 14200,  "tdsCredited": 0 },
    { "id": "A3", "category": "FD_INTEREST",     "source": "HDFC Bank",            "amount": 68000,  "tdsCredited": 6800 },
    { "id": "A4", "category": "DIVIDEND",        "source": "Infosys Ltd",          "amount": 9400,   "tdsCredited": 940 },
    { "id": "A5", "category": "SECURITIES_SALE", "source": "Zerodha Broking",      "amount": 340000, "tdsCredited": 0 },
    { "id": "A6", "category": "FD_INTEREST",     "source": "HDFC Bank",            "amount": 68000,  "tdsCredited": 6800, "note": "possible duplicate of A3" },
    { "id": "A7", "category": "RENT_RECEIVED",   "source": "Tenant PAN XXXXX1234X","amount": 216000, "tdsCredited": 0 }
  ]
}
```

The sample data must be deliberately seeded with **exactly these problems**, so the demo always shows a rich result:
1. TDS mismatch — Form 16 says ₹90,000, AIS credits ₹88,000 (₹2,000 gap)
2. Undeclared savings interest (A2) — user hasn't declared it
3. Undeclared FD interest (A3) — significant, TDS already deducted on it
4. Undeclared dividend (A4)
5. A duplicate AIS entry (A3/A6) — the classic false positive; the app must catch it as *probable duplicate*, not as extra income
6. Securities sale (A5) with no corresponding capital gains declared
7. Rent received (A7) with no house property income declared

### 5.3 Flag taxonomy

Every flag object:

```ts
type Flag = {
  id: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  code: FlagCode;
  title: string;            // plain English, no jargon
  whatItMeans: string;      // 1–2 sentences a non-accountant understands
  ifIgnored: string;        // the actual consequence
  suggestedAction: string;  // concrete next step
  evidence: {               // always show the receipts
    formSixteenValue?: number;
    aisValue?: number;
    difference?: number;
    aisEntryIds?: string[];
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};
```

Flag codes to implement, each with its own detector function and its own unit test:

| Code | Severity | Trigger |
| --- | --- | --- |
| `TDS_CLAIMED_EXCEEDS_CREDITED` | BLOCKER | Form 16 total TDS > sum of AIS `tdsCredited` for that TAN, beyond ₹10 tolerance |
| `TDS_CREDITED_NOT_CLAIMED` | WARNING | AIS credits TDS the user hasn't claimed — they're leaving a refund on the table |
| `INCOME_IN_AIS_NOT_DECLARED` | BLOCKER | An AIS income entry has no corresponding declared income, above a ₹1,000 materiality floor |
| `PROBABLE_DUPLICATE_AIS_ENTRY` | INFO | Two AIS entries with same category + same source + same amount. Must be detected and *excluded* from the undeclared-income total, with the exclusion shown explicitly |
| `SALARY_MISMATCH` | WARNING | Form 16 gross salary ≠ AIS salary entry, beyond ₹100 tolerance |
| `TAN_MISMATCH` | BLOCKER | Form 16 employer TAN not present in any AIS entry |
| `PAN_MISMATCH` | BLOCKER | PAN differs between the two documents |
| `ASSESSMENT_YEAR_MISMATCH` | BLOCKER | The two documents are for different years — a shockingly common real error |
| `SECURITIES_SALE_NO_CG_DECLARED` | WARNING | AIS shows a securities sale, no capital gains entered. Note clearly: a sale is not a gain; this needs the user's cost basis |
| `RENT_RECEIVED_NO_HP_INCOME` | WARNING | AIS shows rent received, no house property income declared |
| `SAVINGS_INTEREST_BELOW_80TTA_CAP` | INFO | Undeclared savings interest that would be fully covered by 80TTA/80TTB in the old regime — must still be declared, but has no tax effect there |
| `QUARTERLY_TDS_SUM_MISMATCH` | WARNING | Sum of quarterly TDS ≠ stated total in Form 16 |
| `TDS_DEPOSITED_LATE` | INFO | A quarter's deposit date is past the statutory due date |

**Tolerance rules:** ₹10 for TDS, ₹100 for salary, ₹1,000 materiality floor for undeclared income. All tolerances live in the rules JSON, not in code.

### 5.4 Notice Risk Score

Aggregate the flags into a single 0–100 score with a transparent, fully-documented formula:

```
score = min(100,
    (blockers × 30)
  + (warnings × 10)
  + (infos × 2)
  + (undeclaredIncomeTotal / grossTotalIncome × 40)
)
```

Bands: **0 = Clean · 1–24 Low · 25–49 Moderate · 50–74 High · 75–100 Critical.**

The score must **always be expandable to show exactly which flags contributed how many points.** A score without its working is a black box, and a black box in a tax tool is worse than no score. Build the expansion, don't defer it.

---

## 6. ARCHITECTURE & FILE STRUCTURE

**Stack:** Next.js (App Router, latest stable) · TypeScript (`strict: true`) · Tailwind CSS · Vitest · Playwright (one smoke test) · Deploy target Vercel. No database. No auth. No state library beyond React state + URL search params.

```
/
├── AGENTS.md                      # how to work in this repo (for future agents & humans)
├── PLANS.md                       # milestone plan with acceptance criteria
├── CODEX_LOG.md                   # agentic work log — see Section 11
├── DISCREPANCIES.md               # anything in this spec that looked wrong, and why
├── README.md                      # see Section 10
├── LICENSE                        # MIT
├── .env.example                   # OPENAI_API_KEY= (optional)
├── .gitignore
│
├── app/
│   ├── layout.tsx                 # fonts, theme, skip-link, footer disclaimer
│   ├── page.tsx                   # landing
│   ├── compare/page.tsx           # Engines 1 + 2
│   ├── reconcile/page.tsx         # Engine 3
│   ├── methodology/page.tsx       # rules, sources, limitations, what's not supported
│   ├── not-found.tsx              # real 404, not the default
│   ├── error.tsx                  # real error boundary with a recovery action
│   └── api/explain/route.ts       # optional LLM narration; degrades gracefully
│
├── lib/
│   ├── tax/
│   │   ├── slabs.ts               # pure slab tax computation
│   │   ├── deductions.ts          # regime filtering + cap enforcement
│   │   ├── hra.ts                 # HRA exemption
│   │   ├── houseProperty.ts       # NAV, 30% SD, interest, ₹2L set-off cap
│   │   ├── capitalGains.ts        # 111A / 112A special rates
│   │   ├── rebate.ts              # 87A + marginal relief
│   │   ├── surcharge.ts           # surcharge + surcharge marginal relief
│   │   ├── compute.ts             # orchestrates the 18-step sequence
│   │   ├── breakEven.ts           # Engine 2
│   │   ├── round.ts               # s.288A / s.288B rounding
│   │   └── types.ts
│   ├── reconcile/
│   │   ├── detectors/             # one file per flag code
│   │   ├── reconcile.ts           # runs all detectors, dedupes, orders by severity
│   │   ├── riskScore.ts
│   │   └── types.ts
│   ├── explain/
│   │   ├── ruleBased.ts           # deterministic explainer — the default
│   │   └── llm.ts                 # optional enhancement; never touches numbers
│   ├── validation/
│   │   └── schemas.ts             # Zod schemas for every input & uploaded file
│   └── format/
│       └── inr.ts                 # ₹ formatting with Indian digit grouping (lakh/crore)
│
├── components/
│   ├── ledger/                    # the signature computation-ledger components
│   ├── inputs/                    # labelled, validated, accessible field components
│   ├── flags/                     # flag card, severity badge, risk gauge
│   └── ui/                        # buttons, tabs, tooltip, dialog, toast
│
├── data/
│   ├── tax-rules/fy-2025-26.json  # every rate, slab, cap, threshold, tolerance
│   ├── samples/                   # form16.sample.json, ais.sample.json, 3 personas
│   └── templates/                 # blank JSON templates for user download
│
└── tests/
    ├── tax/                       # golden cases from Section 9 + property tests
    ├── reconcile/                 # one test per detector, positive AND negative
    └── e2e/smoke.spec.ts          # Playwright
```

**Sample personas** — ship three, selectable from the landing page, each demonstrating a different insight:
1. **Aarav, 26, ₹9L salary, first job** — new regime wins, break-even doesn't exist, 80C is pointless for him. The "don't waste your money" case.
2. **Priya, 34, ₹18L salary, home loan + HRA + full 80C** — old regime wins narrowly. The "your deductions actually paid off" case.
3. **Rohan, 41, ₹14L salary + FD interest + shares sold** — regimes are close, but reconciliation finds four undeclared income sources. The "you were about to get a notice" case.

---

## 7. INPUT VALIDATION & EDGE CASES

Implement every one of these. Each gets a test.

### 7.1 Numeric input
- Reject negative income anywhere. Inline error: *"Income can't be negative."*
- Accept ₹0 in every field — a person with no house property enters nothing, and the app must handle an entirely empty section without NaN.
- Cap any single field at ₹100 crore and show a friendly error above that.
- Handle string input with commas, spaces, `₹`, and Indian grouping (`12,75,000`) — parse it, don't reject it.
- Never render `NaN`, `undefined`, `null`, `Infinity` or `-0`. Format guard in `inr.ts`.
- Floating point: hold all money as **integer paise internally** or use integer rupees throughout with explicit rounding only at s.288A/288B points. Never let `0.1 + 0.2` reach a user's screen. Document the choice.

### 7.2 Logical/domain edge cases
- **HRA claimed with zero rent** → exemption is zero, explain why.
- **Rent ≤ 10% of salary** → exemption is zero (formula would go negative). Clamp at zero, don't show a negative.
- **HRA claimed but the person also claims 80GG** → mutually exclusive. Block with an explanation.
- **80TTA and 80TTB both claimed** → mutually exclusive; auto-switch based on age and explain the switch.
- **80C entered above ₹1.5L** → accept the input, cap the *allowed* value, and show both: "Entered ₹2,10,000 · Allowed ₹1,50,000 · Excess ₹60,000 has no tax effect." Never silently truncate.
- **Deductions exceeding gross total income** → taxable income floors at zero, never negative. Tax is zero.
- **Non-resident** → no 87A rebate under either regime; senior-citizen slab benefits still apply by age. Flag prominently.
- **Age exactly 60 or exactly 80** → inclusive of the senior/super-senior band. Test the boundary.
- **Turns 60 mid-year** → senior for the whole FY. Test with a DOB of 31 March 2026.
- **Taxable income exactly ₹12,00,000** (new) → rebate applies, tax is nil. Test `=`, `−1`, `+1`.
- **Taxable income exactly ₹5,00,000** (old) → rebate applies. Test the same three points.
- **Income exactly at ₹50L / ₹1Cr / ₹2Cr / ₹5Cr** → surcharge threshold is "exceeds", so at exactly ₹50,00,000 there is **no** surcharge. Test `=` and `+1`.
- **Marginal relief zone** → test at ₹12,00,001, ₹12,10,000, ₹12,70,000, ₹12,80,000.
- **Standard deduction with no salary income** → not available. Someone with only interest income gets ₹0 standard deduction under both regimes. Common bug; test it.
- **LTCG below ₹1,25,000** → fully exempt, contributes ₹0 tax but still counts toward total income for surcharge purposes.
- **Let-out property loss > ₹2L** → set off ₹2L, carry forward the rest, show the carry-forward amount explicitly.
- **Both regimes produce identical tax** → don't crash the "winner" logic. Show a tie state: *"Both regimes compute the same. The new regime is the default and needs no paperwork."*
- **Employer NPS > 14% of basic** → cap at 14%, show the excess as taxable perquisite in a note.

### 7.3 File upload edge cases
- Wrong file type → clear error, keep prior state, don't blank the form.
- Malformed JSON → show the parse error position, don't crash.
- Valid JSON but wrong schema → Zod error mapped to a human-readable list of what's missing.
- Correct schema, wrong assessment year → this is a real flag (`ASSESSMENT_YEAR_MISMATCH`), not a rejection. Load it and flag it.
- Empty AIS `entries` array → valid; produce a "nothing to reconcile" state, not an error.
- File > 2MB → reject with a size message.
- Two files where the user uploaded Form 16 into the AIS slot → detect via `documentType` and offer a one-click swap.

### 7.4 State & navigation
- All inputs serialise to URL search params so a result is **shareable and refresh-proof**. Test a hard refresh mid-flow.
- Browser back must move between wizard steps sensibly.
- A "Reset everything" action exists, confirms first, and actually clears state.
- No `localStorage` dependency for core function (it may be used for convenience, but the app must work with it disabled).

---

## 8. DESIGN SPECIFICATION

### 8.1 Design thesis

The subject is **the ledger**. Not fintech-startup gradients, not neobank purple — the visual world of Indian accounting: green-bar ledger paper, ruled columns, tabular figures, red and black ink, the rubber-stamp, the working note in the margin. The app's job is to make a taxpayer feel that someone has actually *shown their work*. Green is not decoration here; green-bar continuous-feed accounting paper is a real artifact from this exact domain, and that's what the theme is rooted in.

**Explicitly avoid:** the cream `#F4F1EA` + high-contrast-serif + terracotta look, the near-black + neon-accent look, glassmorphism, dark hero with gradient mesh, and any big-number-with-small-label-plus-gradient hero. Those are defaults, not choices.

### 8.2 Colour tokens

Define in `globals.css` as CSS variables and map into Tailwind theme. **These exact values:**

```css
--paper:        #F5F8F2;   /* page background — pale ledger stock */
--paper-raised: #FFFFFF;   /* cards, inputs */
--bar:          #E2EDE0;   /* the green bar — alternating ledger rows ONLY */
--rule:         #C3D5C2;   /* hairline rules, borders */
--ink:          #10201A;   /* primary text — near-black with green cast */
--ink-soft:     #4A5D53;   /* secondary text */
--green:        #1B6B45;   /* primary action, "winner", positive */
--green-deep:   #0E3D27;   /* headers, emphasis, hover */
--green-wash:   #EAF3E8;   /* subtle positive fill */
--amber:        #A9701A;   /* WARNING severity */
--amber-wash:   #FAF1DE;
--red:          #9E3220;   /* BLOCKER severity, tax payable */
--red-wash:     #FAEBE7;
```

Dark mode: **skip it.** A half-done dark mode is worse than none, and this is a print-lineage aesthetic. Say so in the README rather than shipping a broken toggle. (A toggle that does nothing would violate Section 8.9.)

### 8.3 Typography

Load via `next/font/google`. Three roles, deliberately paired:

- **Display — `Fraunces`** (variable, `opsz` and `SOFT`/`WONK` axes). Used at large sizes only: page titles, the winning-regime figure, section headers. Its slightly eccentric, engraved quality reads as *printed document*, not *SaaS landing page*. Weight 600, optical size set high for large text.
- **Body — `IBM Plex Sans`.** Neutral, excellent at small sizes, has a genuine technical-documentation lineage. Weights 400/500/600.
- **Figures — `IBM Plex Mono`, `font-variant-numeric: tabular-nums`.** *Every rupee figure in the app uses this.* Non-negotiable — numbers must align vertically in every column of every table. This one rule does more for the "real ledger" feeling than anything else.

Type scale (rem): `0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.5 / 3.5`. Line height 1.5 body, 1.15 display. Letter-spacing: `-0.02em` on display, `0` on body, `0` on mono.

### 8.4 Layout & structure

- Max content width 1120px, generous margins, 8px spacing base.
- Hairline rules (`1px solid var(--rule)`) instead of drop shadows. This is a paper aesthetic — **no `box-shadow` anywhere except focus rings and the one modal overlay.**
- Border radius: `2px` on everything. Near-square, like a ruled form. Not `rounded-xl`.
- Numeric columns right-aligned. Label columns left-aligned. Always.

### 8.5 The signature element — the Comparison Ledger

This is the one thing the app is remembered by. Spend the design boldness here and keep everything else quiet.

A single table, both regimes side by side, sharing row labels — the 18 computation steps as rows:

```
┌──────────────────────────────────────────┬───────────────┬───────────────┐
│                                          │  OLD REGIME   │  NEW REGIME   │
├──────────────────────────────────────────┼───────────────┼───────────────┤
│  Gross salary                            │    14,50,000  │    14,50,000  │   ← bar tint
│  Less: HRA exemption            10(13A)  │    (2,10,000) │            —  │
│  Less: Standard deduction                │      (50,000) │      (75,000) │   ← bar tint
│  Income from other sources               │       82,200  │       82,200  │
│  Less: 80C                               │    (1,50,000) │  ̶(̶1̶,̶5̶0̶,̶0̶0̶0̶)̶  │   ← struck, "not allowed"
│  ...                                     │               │               │
│  Taxable income                    288A  │    10,22,200  │    13,57,200  │
│  Tax at slab rates                       │     1,16,660  │     1,23,580  │   ← bar tint
│  Less: Rebate                       87A  │            —  │            —  │
│  Add: Cess                          4%   │        4,666  │        4,943  │
├──────────────────────────────────────────┼───────────────┼───────────────┤
│  TOTAL TAX                               │   1,21,330    │   1,28,520    │
└──────────────────────────────────────────┴───────────────┴───────────────┘
                                            ╰─ winner column: green-wash fill,
                                               2px green left rule, small
                                               "LOWER BY ₹7,190" stamp
```

Details that make it work:
- Alternating row tint using `--bar` — **the green bar appears nowhere else in the app.** That's what makes it a signature rather than a texture.
- Section codes (`10(13A)`, `288A`, `87A`, `4%`) in the right margin of the label column, in mono, `--ink-soft`, small. These encode something true — they're the statutory authority for each line, and they let a user or a CA verify. Structure carrying information, not decoration.
- Disallowed lines shown struck through in the losing column with a small "not allowed in new regime" label. The visible loss is the insight.
- Winner column marked with a fill + rule + text label. **Never colour alone** — the label "LOWER BY ₹X" carries the meaning for colour-blind and screen-reader users.
- Every row expandable on click to reveal the working for that line (e.g. clicking HRA exemption reveals the three-way `min()` with all three values computed). Collapsed by default. This is where "show your work" becomes real.
- On mobile (<720px): the two columns become two stacked cards with a sticky comparison bar at the bottom showing both totals and the delta. Do not attempt to horizontally scroll a wide table on mobile.

### 8.6 Motion

Restrained, and only where it carries meaning:
- On first computation, the ledger rows reveal top-to-bottom, 24ms stagger, 160ms fade+2px rise. It reads as a document being typed out — appropriate to the subject, once, and not repeated on every re-render.
- The winner column's fill transitions over 240ms when the winner changes (during break-even slider drag). This is the one moment where motion communicates a real state change.
- Numbers tween over 200ms when they change. Use tabular figures so nothing reflows.
- Everything above wrapped in `@media (prefers-reduced-motion: reduce)` → instant, no transitions.
- **No** scroll-jacking, parallax, ambient animation, or floating elements.

### 8.7 Page-by-page

**`/` — Landing.**
Hero is a thesis, not a marketing block: a live, working mini-ledger showing one persona's actual comparison, already computed, with the real numbers. The product demonstrates itself in the first viewport. Below it: one line on what this does, the three persona cards (each loads that persona into `/compare` — real action), and a link to `/methodology`. No feature grid. No testimonials. No fake logos. No "trusted by" strip.

**`/compare` — Engines 1 & 2.**
Three-step wizard (Profile → Income → Deductions), each step validated before advancing, with a persistent summary rail showing the live running comparison as the user types. Then, below: the Comparison Ledger, the break-even slider, the detailed 18-step breakdown, the explanation panel, and the export actions. All on one page, anchored, so nothing is hidden behind a click the user might not make.

**`/reconcile` — Engine 3.**
Two upload/paste panels side by side (Form 16 | AIS), each with: load sample, download blank template, paste JSON, upload file. Below: the risk gauge with its expandable working, then flags grouped by severity with BLOCKERs first. Each flag card shows evidence side-by-side with the difference highlighted. A "copy all flags as a checklist" action that actually copies markdown to the clipboard, with a confirmation toast.

**`/methodology` — Trust page.**
Every slab table rendered from the same JSON the engine uses (so it can never drift from the code). The `lastVerified` date. Source notes. An explicit, honest **"What this tool does not handle"** list: business income, foreign income, crypto/VDA, clubbing, presumptive taxation, revised/belated return rules, advance tax interest under 234A/B/C. A link to the repo. The disclaimer in full.

Being loudly honest about limitations is a *strength* in front of judges — it signals the builder knows the domain's edges rather than pretending they don't exist.

**`/not-found` and `/error`.** Real pages, in the design language, each with a working action that gets the user somewhere useful.

### 8.8 Copy rules

- Sentence case everywhere. No Title Case Buttons.
- Active voice. The button says what happens: "Compare regimes", not "Submit". "Download summary", not "Export".
- An action keeps its name through the whole flow — the button "Compare regimes" produces a heading "Regime comparison".
- Plain words over jargon in the primary line, statutory term in the secondary line. Not: *"Rebate u/s 87A applied."* Instead: *"Your tax comes to zero after the standard rebate."* with `87A` in the margin.
- Errors state what happened and what to do, in the interface's voice. No apologising, no exclamation marks, no "Oops!".
- Empty states are invitations with an action attached, never just an illustration and a sad sentence.
- Never say "you should", "we recommend", "you must file". Say "based on these figures, X computes lower by ₹Y."
- No emoji anywhere in the product UI.

### 8.9 The "no dead UI" rule — enforced, not aspirational

Every interactive element must do something real and visible. Specifically banned: `href="#"`, `onClick={() => {}}`, disabled-forever buttons, tabs that render identical content, a settings icon with no settings, social icons linking nowhere, a search field that doesn't search, a dark-mode toggle that doesn't toggle, "Coming soon" badges, and any nav link to a route that doesn't exist.

**Enforcement — build this as an actual test, `tests/e2e/no-dead-ui.spec.ts`:**
1. Crawl every route.
2. Assert no anchor has `href="#"`, empty, or `javascript:void(0)`.
3. Assert every internal link resolves to a route that returns 200.
4. Click every button on every page; assert that each produces a detectable change — DOM mutation, navigation, network call, focus change, or clipboard write.
5. Fail the build if any element produces no observable effect.

If a control can't pass this test, **delete the control**. A smaller app where everything works beats a larger one with hollow surfaces, and this is exactly what a judge finds in the first thirty seconds of poking around.

---

## 9. TESTING REQUIREMENTS

### 9.1 Golden test cases

Encode these as `tests/tax/golden.test.ts`. All figures are for a **resident individual below 60, salaried, FY 2025-26**, with no capital gains and no house property unless stated.

**Case A — the ₹12.75L cliff**
Gross salary ₹12,75,000. No deductions.
- New: taxable ₹12,00,000 → slab tax ₹60,000 → 87A rebate ₹60,000 → **₹0**
- Old: taxable ₹12,25,000 → slab tax ₹1,80,000 → cess ₹7,200 → **₹1,87,200**
- Winner: new, by ₹1,87,200

**Case B — marginal relief**
Gross salary ₹12,80,000. No deductions.
- New: taxable ₹12,05,000 → slab tax ₹60,750 → no rebate (over ₹12L) → marginal relief caps tax at the ₹5,000 excess → tax ₹5,000 → cess ₹200 → **₹5,200**
- This case exists specifically to catch a missing marginal-relief implementation, which would wrongly produce ₹63,180.

**Case C — deductions still lose**
Gross salary ₹10,00,000. Old-regime deductions: 80C ₹1,50,000 + 80D ₹25,000.
- New: taxable ₹9,25,000 → slab tax ₹32,500 → rebate ₹32,500 → **₹0**
- Old: taxable ₹7,75,000 → slab tax ₹67,500 → cess ₹2,700 → **₹70,200**
- Break-even: does not exist. `breakEvenExists === false`.

**Case D — surcharge**
Gross salary ₹60,00,000. No deductions.
- New: taxable ₹59,25,000 → slab tax ₹13,57,500 → surcharge 10% ₹1,35,750 → no surcharge marginal relief needed → cess ₹59,730 → **₹15,52,980**

**Case E — surcharge threshold boundary**
Total income exactly ₹50,00,000 → surcharge is **nil** (the law says "exceeds"). At ₹50,00,001 → surcharge applies, and surcharge marginal relief must bring the increase in tax below the ₹1 increase in income. Assert the tax at ₹50,00,001 is not more than ₹1 higher than at ₹50,00,000.

**Case F — old regime wins**
Gross salary ₹18,00,000, basic ₹9,00,000, HRA received ₹3,60,000, rent paid ₹3,60,000 in Mumbai, 80C ₹1,50,000, 80CCD(1B) ₹50,000, 80D ₹25,000, home loan interest ₹2,00,000 (self-occupied).
Compute both; assert old regime is lower and `breakEvenExists === true` with `gap ≤ 0` (already past break-even).

> **Codex:** compute every one of these from first principles using the rules in Section 3 before writing the assertions. If your computed value differs from the value stated here, **do not edit the test to match your code and do not edit your code to match the test without understanding why.** Work out which is right, implement the correct one, and record the resolution in `DISCREPANCIES.md`.

### 9.2 Property-based tests
- Monotonicity: increasing any deduction never increases old-regime tax.
- Monotonicity: increasing gross income never decreases tax (this is precisely what marginal relief guarantees; the test proves the relief is correctly implemented).
- Non-negativity: tax ≥ 0 for all inputs.
- Rebate bound: rebate never exceeds tax before cess.
- Break-even validity: at `breakEvenDeductions`, old-regime tax ≤ new-regime tax; at `breakEvenDeductions − 100`, it is not.

### 9.3 Reconciliation tests
One test file per detector, each with a positive case (fires correctly), a negative case (does not fire on clean data), and a boundary case (exactly at the tolerance). The duplicate detector additionally needs a test proving duplicated amounts are excluded from the undeclared-income total.

### 9.4 E2E
`tests/e2e/smoke.spec.ts`: load `/` → click a persona → assert the ledger renders with a non-zero, correctly formatted figure → drag the break-even slider → assert the winner flips or the correct "no break-even" message shows → navigate to `/reconcile` → load both samples → assert exactly the expected number of flags by severity → export the summary → assert the download fires.

Plus `tests/e2e/no-dead-ui.spec.ts` from Section 8.9.

### 9.5 Coverage floor
`lib/tax/**` and `lib/reconcile/**` at **≥90% line coverage**. Enforce in CI config. UI coverage is not required.

---

## 10. DELIVERABLES

- **Full working source**, committed in small logical commits.
- **`README.md`** — what it is, the problem in three sentences, a screenshot, 5-minute local setup, 5-minute Vercel deploy, architecture overview, "what's deterministic vs what's LLM" (be very explicit — this is the credibility line), the limitations list, and the disclaimer.
- **`AGENTS.md`** — repo conventions, where tax rules live and how to update them for a new FY, how to add a new deduction, how to add a new reconciliation detector, testing commands, the "no dead UI" rule.
- **`CODEX_LOG.md`** — see Section 11.
- **`DISCREPANCIES.md`** — anything in this spec that looked wrong.
- **`.env.example`**, **MIT `LICENSE`**.
- **Demo script** — a 5-line, 90-second walkthrough in the README: load Rohan → show the ledger → drag to break-even → run reconciliation → show the four undeclared sources and the risk score.

---

## 11. CODEX_LOG.md — the agentic work record

Maintain this throughout as a genuine engineering log. For each milestone, append:

```markdown
## Milestone N — <name>
**Planned:** what PLANS.md said this milestone would deliver
**Built:** files created/changed, approach taken
**Verified:** typecheck / lint / tests — actual results, not "passing"
**Self-review findings:** what the review pass caught and how it was fixed
**Deferred:** what was consciously left, and why
**Open questions:** anything needing a human decision
```

This is a real engineering artifact — it makes the multi-step planning, execution and review loop legible to anyone reading the repo later, including someone evaluating how the work was actually done.

---

## 12. NON-GOALS — do not build these

Building any of these makes the product worse by spreading effort thin. If tempted, add to a "Future work" section in the README instead.

- **PDF parsing of real Form 16 / AIS documents.** Layouts vary by employer and the failure mode is silent wrong numbers in a tax tool. JSON in, JSON out. Document this as a deliberate decision in the README — it is a correctness choice, not a shortcut, and it should be defended as one.
- Actual e-filing, or any integration with the income tax portal.
- User accounts, login, saved profiles, any database.
- Business income, professional income, presumptive taxation (44AD/44ADA).
- Foreign income, foreign assets, DTAA, NRI-specific computation beyond the residency flag's effect on 87A.
- Crypto/VDA under s.115BBH.
- Advance tax, interest under 234A/234B/234C, penalties.
- Clubbing of income, HUF, partnership, trusts.
- Multi-year comparison or historical FYs.
- Dark mode.
- A chatbot. There is a targeted explanation feature; that's enough.
- Any payment, pricing, or waitlist surface.

---

## 13. DEFINITION OF DONE

Do not declare completion until every box is genuinely true. Verify each by actually running it, not by reading the code.

**Functionality**
- [ ] `npm install && npm run dev` works from a clean clone with no env file
- [ ] All three personas load and produce correct, complete results
- [ ] All 18 computation steps render with values in the detailed breakdown
- [ ] Break-even slider works with mouse, touch, and keyboard; the "no break-even exists" case is handled with the plain-English message
- [ ] Reconciliation on the sample pair produces flags of all three severities, correctly detects the duplicate, and excludes it from the undeclared total
- [ ] Risk score expands to show which flag contributed how many points
- [ ] Export produces a real downloadable file containing the actual computed figures
- [ ] The app works fully with `OPENAI_API_KEY` absent; the rule-based explanations are good, not stubs
- [ ] With a key present, LLM explanations appear and no displayed number changes

**Quality gates**
- [ ] `npm run typecheck` clean, `strict: true`, zero `any` in `lib/`
- [ ] `npm run lint` clean
- [ ] `npm test` passes; `lib/tax` and `lib/reconcile` ≥ 90% coverage
- [ ] All Section 9.1 golden cases pass
- [ ] All Section 7 edge cases have a test
- [ ] `npm run build` succeeds
- [ ] Playwright smoke test passes
- [ ] `no-dead-ui` test passes

**Design & accessibility**
- [ ] Usable and correct at 360px width
- [ ] Every interactive element keyboard reachable with a visible focus ring
- [ ] `prefers-reduced-motion` respected
- [ ] Colour is never the only carrier of meaning
- [ ] Contrast meets WCAG AA
- [ ] Every rupee figure uses tabular mono figures and Indian digit grouping
- [ ] No `NaN` / `undefined` / `-0` reachable by any input path

**Documentation**
- [ ] README, AGENTS.md, CODEX_LOG.md, DISCREPANCIES.md, PLANS.md all present and genuinely written
- [ ] Disclaimer visible on every result surface
- [ ] `/methodology` renders its tables from the same JSON the engine consumes

**Final step:** print the exact commands to run locally, the Vercel deploy steps, and the 5-line demo script.

---

## 14. DISCLAIMER TEXT (use verbatim)

> Lekha computes income tax from the figures you enter, using the slab rates and rules for FY 2025-26 (AY 2026-27). It is a calculation and checking aid, not tax advice, and it does not file anything. Rules change and individual situations vary — confirm anything material with a qualified chartered accountant before you file.
