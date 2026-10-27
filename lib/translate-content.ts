import { env } from 'cloudflare:workers';

export async function translateContent(title: string, body: string): Promise<{ title: string; body: string }> {
  if (!env.OPENAI_API_KEY) throw new Error('Translation service is not configured');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      store: false,
      instructions: 'Translate Vietnamese website copy into natural English. Preserve facts, names, prices, and formatting. Do not invent details. Return only the requested JSON.',
      input: JSON.stringify({ title, body }),
      text: { format: { type: 'json_schema', name: 'translation', strict: true, schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } }, required: ['title', 'body'], additionalProperties: false } } },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
  const data = await response.json() as { output?: { content?: { type?: string; text?: string }[] }[] };
  const output = data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!output) throw new Error('Translation service returned no text');
  const translated = JSON.parse(output) as { title?: unknown; body?: unknown };
  if (typeof translated.title !== 'string' || !translated.title.trim() || typeof translated.body !== 'string') throw new Error('Invalid translation');
  return { title: translated.title.trim().slice(0, 180), body: translated.body.trim().slice(0, 8000) };
}
