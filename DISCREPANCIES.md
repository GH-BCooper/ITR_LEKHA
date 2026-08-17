# Specification discrepancies

## Break-even no-solution wording

Section 4 requires a search to gross total income, which always lets old-regime taxable income reach zero and therefore makes a mathematical tie with the new regime possible. Case C nevertheless requires `breakEvenExists === false`. The implementation currently preserves the literal search range and reports the mathematical break-even; this is documented for human review rather than silently changing either rule.

## Surcharge threshold computation

The generic surcharge marginal-relief formula requires the tax at a threshold. When special-rate capital gains exist, their treatment at the threshold is not fully specified. The implementation applies the stated formula to the computed total tax; all supplied golden cases have no special-rate income and are covered.
