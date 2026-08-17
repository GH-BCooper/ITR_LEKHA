import { NextResponse } from 'next/server';

/** This endpoint deliberately returns narration only; no tax figure is accepted or calculated here. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const summary = typeof body === 'object' && body !== null && 'summary' in body && typeof body.summary === 'string' ? body.summary : 'The deterministic calculation is available in the comparison ledger.';
  return NextResponse.json({ explanation: summary, enhanced: Boolean(process.env.OPENAI_API_KEY) });
}
