# Specification discrepancies

## Break-even no-solution wording

Section 4 requires a search to gross total income, which always lets old-regime taxable income reach zero and therefore makes a mathematical tie with the new regime possible. Case C nevertheless requires `breakEvenExists === false`. The implementation currently preserves the literal search range and reports the mathematical break-even; this is documented for human review rather than silently changing either rule.

## Surcharge threshold computation

The generic surcharge marginal-relief formula requires the tax at a threshold. When special-rate capital gains exist, their treatment at the threshold is not fully specified. Resolved: the tax at the threshold is now computed with the same capital gains, trimming slab income first (then gains if needed), and the 15% surcharge cap on special-rate tax is applied on both sides. A regression test checks continuity just above ₹50L with large STCG.

## 87A marginal relief with special-rate income

The spec does not say whether 111A/112A income counts towards the ₹12L rebate threshold or its marginal relief. The implementation counts it for eligibility and the relief comparison, but applies the rebate and relief only to slab-rate tax. This is documented on the methodology page.

## 80G qualifying limit

The Act limits qualifying donations to 10% of adjusted gross total income. The implementation uses gross total income, which slightly overstates the limit when other Chapter VI-A deductions exist.
