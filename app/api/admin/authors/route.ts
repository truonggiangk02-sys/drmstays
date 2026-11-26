import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { AUTHOR_LIMITS, isAuthorKind } from '@/lib/authors';
import { removeAuthorPhotos, storeAuthorPhoto } from '@/lib/journal-images';

const back = (request: NextRequest, query: string) => NextResponse.redirect(new URL(`/admin/journal?${query}#authors`, request.url), 303);
const field = (form: FormData, key: string, max: number) => String(form.get(key) || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Add, change or remove an author of journal posts (name, job title, short bio, https page, photo). */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 4_000_000) return new NextResponse('Request too large', { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return new NextResponse('Invalid request', { status: 400 }); }
  const action = String(form.get('action') || '');
  const idValue = String(form.get('id') || '');
  if (action !== 'save' && action !== 'delete' && action !== 'remove-photo') return new NextResponse('Invalid action', { status: 400 });
  if (idValue && !/^[0-9a-f-]{36}$/i.test(idValue)) return new NextResponse('Invalid author', { status: 400 });

  try {
    if (action === 'delete' || action === 'remove-photo') {
      if (!idValue) return new NextResponse('Invalid author', { status: 400 });
      await removeAuthorPhotos(idValue);
      if (action === 'remove-photo') await env.DB.prepare("UPDATE authors SET photo_id = '' WHERE id = ?").bind(idValue).run();
      else {
        await env.DB.prepare("UPDATE site_content_items SET author_id = '' WHERE author_id = ?").bind(idValue).run();
        await env.DB.prepare('DELETE FROM authors WHERE id = ?').bind(idValue).run();
      }
      return back(request, action === 'delete' ? 'saved=deleted' : 'saved=author');
    }

    const name = field(form, 'name', AUTHOR_LIMITS.name);
    const url = field(form, 'url', AUTHOR_LIMITS.url);
    if (!name) return back(request, 'error=name');
    if (url && !/^https:\/\/\S+$/i.test(url)) return back(request, 'error=url');
    const id = idValue || crypto.randomUUID();
    const kind = String(form.get('kind') || 'person');
    await env.DB.prepare('INSERT INTO authors (id, name, role, bio, url, kind) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, bio = excluded.bio, url = excluded.url, kind = excluded.kind')
      .bind(id, name, field(form, 'role', AUTHOR_LIMITS.role), field(form, 'bio', AUTHOR_LIMITS.bio), url, isAuthorKind(kind) ? kind : 'person').run();
    const photo = form.get('photo');
    if (photo instanceof File && photo.size > 0) {
      if (!env.BUCKET) return back(request, 'error=photo');
      const stored = await storeAuthorPhoto(id, new Uint8Array(await photo.arrayBuffer()));
      if (!stored.ok) return back(request, 'error=photo');
    }
    return back(request, 'saved=author');
  } catch {
    return back(request, 'error=migration'); // the authors table needs migration 0021
  }
}
