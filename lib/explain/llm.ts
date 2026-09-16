/**
 * Optional narration layer. It only rephrases a fact sheet the deterministic engine already produced.
 * Any reply that contains a number not present in the facts is discarded, so a model can never
 * introduce or alter a rupee figure.
 */
const numbersIn = (text: string) => new Set((text.match(/\d[\d,]*(\.\d+)?/g) ?? []).map((item) => item.replace(/,/g, '')));

export function onlyUsesKnownNumbers(reply: string, facts: string): boolean {
  const known = numbersIn(facts);
  return [...numbersIn(reply)].every((value) => known.has(value));
}

export async function narrate(facts: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  const response = await fetcher('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You explain an Indian income-tax regime comparison to a salaried person in warm, plain English (max 120 words, no headings). Use ONLY the facts provided. Never calculate, round, estimate or introduce any number that is not written in the facts; copy figures exactly. Do not give filing advice beyond the facts.' },
        { role: 'user', content: facts }
      ]
    })
  });
  if (!response.ok) return null;
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const reply = data.choices?.[0]?.message?.content?.trim();
  return reply && onlyUsesKnownNumbers(reply, facts) ? reply : null;
}
