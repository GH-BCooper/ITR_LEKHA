/** Sections 288A and 288B require total income and final tax to nearest ₹10. */
export function round10(value: number): number { return Math.round(value / 10) * 10; }
