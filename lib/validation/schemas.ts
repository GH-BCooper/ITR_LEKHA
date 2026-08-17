import { z } from 'zod';

const money = z.number().finite().min(0).max(1_000_000_000);
const quarter = z.object({ quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']), amount: money, depositedOn: z.string().date() });
export const form16Schema = z.object({ documentType: z.literal('FORM16'), assessmentYear: z.string().regex(/^20\d{2}-\d{2}$/), pan: z.string().min(1), employer: z.object({ name: z.string().min(1), tan: z.string().min(1) }), salary: z.object({ gross: money, basic: money, da: money, hraReceived: money, exemptAllowances: money, employerNpsContribution: money }), deductionsConsidered: z.record(z.string(), money), tdsQuarterly: z.array(quarter), totalTds: money });
export const aisSchema = z.object({ documentType: z.literal('AIS'), assessmentYear: z.string().regex(/^20\d{2}-\d{2}$/), pan: z.string().min(1), entries: z.array(z.object({ id: z.string().min(1), category: z.enum(['SALARY', 'SAVINGS_INTEREST', 'FD_INTEREST', 'DIVIDEND', 'SECURITIES_SALE', 'RENT_RECEIVED']), source: z.string().min(1), sourceTan: z.string().optional(), amount: money, tdsCredited: money, note: z.string().optional() })) });
export function parseMoney(value: string): number | undefined {
  const cleaned = value.replace(/[₹,\s]/g, ''); if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const parsed = Number(cleaned); return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000_000 ? Math.round(parsed) : undefined;
}
