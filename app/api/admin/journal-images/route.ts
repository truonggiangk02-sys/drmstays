import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { BLOG } from '@/lib/blog-standard';
import { deletePostPhoto, fetchPublicImage, listPostPhotos, postExists, setCover, setPhotoAlt, storePostPhoto } from '@/lib/journal-images';

const NO_STORE = { 'Cache-Control': 'no-store' };
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const alt = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim().slice(0, BLOG.store.coverAlt) : '');

/**
 * Photos of a journal post, for the editor: upload (with the description every photo must have), copy pictures from
 * other websites into the library, set the cover, change a description, delete. Answers with the post's photo list.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB || !env.BUCKET) return reply({ error: 'Image storage unavailable' }, 503);
  if (Number(request.headers.get('content-length') || 0) > BLOG.imageBytes + 1_500_000) return reply({ error: 'Upload too large' }, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return reply({ error: 'Invalid request' }, 400); }
  const postId = String(form.get('postId') || '');
  const action = String(form.get('action') || '');
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return reply({ error: 'Invalid post' }, 400);
  if (!(await postExists(postId))) return reply({ error: 'Lưu nháp bài trước khi thêm ảnh.' }, 404);
  const failed: string[] = [];
  const added: Array<{ id: string; url?: string }> = [];

  if (action === 'upload') {
    const description = alt(form.get('alt'));
    if (!description) return reply({ error: 'Nhập mô tả ảnh trước khi tải lên.' }, 400);
    const files = form.getAll('image').filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) return reply({ error: 'Chưa chọn ảnh.' }, 400);
    for (const file of files.slice(0, 5)) {
      const stored = await storePostPhoto(postId, new Uint8Array(await file.arrayBuffer()), description);
      if (stored.ok) added.push({ id: stored.id }); else failed.push(`${file.name || 'ảnh'}: ${stored.error}`);
    }
  } else if (action === 'import') {
    const urls = form.getAll('url').map(String).slice(0, 10);
    const descriptions = form.getAll('alt');
    for (const [index, url] of urls.entries()) {
      const fetched = await fetchPublicImage(url);
      if (!fetched.ok) { failed.push(`${url.slice(0, 80)}: ${fetched.error}`); continue; }
      const stored = await storePostPhoto(postId, fetched.bytes, alt(descriptions[index] ?? null));
      if (stored.ok) added.push({ id: stored.id, url }); else failed.push(`${url.slice(0, 80)}: ${stored.error}`);
    }
  } else if (action === 'cover' || action === 'delete' || action === 'alt') {
    const imageId = String(form.get('imageId') || '');
    const done = action === 'cover' ? await setCover(postId, imageId) : action === 'delete' ? await deletePostPhoto(postId, imageId) : await setPhotoAlt(postId, imageId, alt(form.get('alt')));
    if (!done) return reply({ error: 'Không tìm thấy ảnh.' }, 404);
  } else return reply({ error: 'Invalid action' }, 400);

  return reply({ photos: await listPostPhotos(postId), added, failed }, added.length || !failed.length ? 200 : 400);
}
