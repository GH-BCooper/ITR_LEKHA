import { NextResponse } from 'next/server';
import { narrate } from '@/lib/explain/llm';

/**
 * Receives the deterministic fact sheet and returns narration only. No tax figure is accepted
 * as input to a calculation or computed here. Without OPENAI_API_KEY the facts are returned as-is.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const facts = typeof body === 'object' && body !== null && 'facts' in body && typeof body.facts === 'string' ? body.facts.slice(0, 4000) : '';
  if (!facts) return NextResponse.json({ error: 'Send the computed facts as { "facts": string }.' }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ explanation: facts, enhanced: false });
  try {
    const explanation = await narrate(facts, apiKey);
    return NextResponse.json(explanation ? { explanation, enhanced: true } : { explanation: facts, enhanced: false });
  } catch {
    return NextResponse.json({ explanation: facts, enhanced: false });
  }
}
