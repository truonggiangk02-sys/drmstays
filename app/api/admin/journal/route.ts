import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { parsePayload, runJournalAction } from '@/lib/journal-admin';
import { readLimitedBody } from '@/lib/request';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * The buttons of the journal editor (save draft, mark ready, publish, update, take down, archive, delete). JSON in, JSON out.
 * The quality checks run again here, so a post with a blocking error can never become ready or live through this route.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return NextResponse.json({ error: 'Database unavailable' }, { status: 503, headers: NO_STORE });
  const raw = await readLimitedBody(request, 400_000);
  if (!raw) return NextResponse.json({ error: 'Request too large' }, { status: 413, headers: NO_STORE });
  let json: unknown;
  try { json = JSON.parse(new TextDecoder().decode(raw)); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: NO_STORE }); }
  const payload = parsePayload(json);
  if (!payload) return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  const result = await runJournalAction(payload);
  return NextResponse.json(result.ok ? result : { error: result.error, checks: result.checks }, { status: result.ok ? 200 : result.code, headers: NO_STORE });
}
