import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { runBackup } from '@/lib/backup';

/** "Back up now" button on the health page: runs the same backup as the daily schedule and reports the outcome. */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  const back = new URL('/admin/health', request.url);
  if (!env.DB || !env.BUCKET) { back.searchParams.set('backup', 'unavailable'); return NextResponse.redirect(back, 303); }
  try {
    const result = await runBackup(env.DB, env.BUCKET);
    back.searchParams.set('backup', `ok:${result.rows}`);
  } catch (error) {
    console.error('Manual backup failed:', error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    back.searchParams.set('backup', 'failed');
  }
  return NextResponse.redirect(back, 303);
}
