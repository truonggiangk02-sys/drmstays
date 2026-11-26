import { env } from 'cloudflare:workers';
import { BLOG } from './blog-standard';
import { imageSize } from './image-size';
import { catalogImageUrl } from './image-url';

/** Photos of a journal post live in catalog_images (owner_type 'content', owner_id = the post's id); the first one is the cover. */
export type PostPhoto = { id: string; url: string; alt: string; width?: number; height?: number };

export type ImageKind = 'image/jpeg' | 'image/png' | 'image/webp';

/** What the file really is, judged by its first bytes; the type the browser reports is not trusted. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function listPostPhotos(postId: string): Promise<PostPhoto[]> {
  if (!env.DB) return [];
  const result = await env.DB.prepare("SELECT id, alt, width, height FROM catalog_images WHERE owner_type = 'content' AND owner_id = ? AND category = 'photo' ORDER BY position, id")
    .bind(postId).all<{ id: string; alt: string; width: number | null; height: number | null }>();
  return (result.results || []).map(row => ({ id: row.id, url: catalogImageUrl(row.id), alt: row.alt, ...(row.width && row.height ? { width: row.width, height: row.height } : {}) }));
}

export async function postExists(postId: string): Promise<boolean> {
  return !!(await env.DB!.prepare("SELECT 1 FROM site_content_items WHERE id = ? AND section = 'journal' AND deleted = 0").bind(postId).first().catch(() => null));
}

type Stored = { ok: true; id: string } | { ok: false; error: string };

/** Checks a file's bytes (real type, size) and stores it as the next photo of the post. */
export async function storePostPhoto(postId: string, bytes: Uint8Array, alt: string): Promise<Stored> {
  if (bytes.byteLength > BLOG.imageBytes) return { ok: false, error: `Ảnh lớn hơn ${Math.round(BLOG.imageBytes / 1_000_000)} MB.` };
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false, error: 'Không phải ảnh JPG, PNG hoặc WebP.' };
  const taken = (await env.DB!.prepare("SELECT COUNT(*) AS n FROM catalog_images WHERE owner_type = 'content' AND owner_id = ? AND category = 'photo'").bind(postId).first<{ n: number }>())?.n || 0;
  if (taken >= BLOG.imagesPerPost) return { ok: false, error: `Mỗi bài tối đa ${BLOG.imagesPerPost} ảnh.` };
  const size = imageSize(bytes);
  const id = crypto.randomUUID();
  const key = `catalog/content/${postId}/${id}`;
  await env.BUCKET!.put(key, bytes, { httpMetadata: { contentType: mime } });
  try {
    await env.DB!.prepare("INSERT INTO catalog_images (id, owner_type, owner_id, object_key, mime, alt, position, category, width, height) VALUES (?, 'content', ?, ?, ?, ?, ?, 'photo', ?, ?)")
      .bind(id, postId, key, mime, alt.slice(0, BLOG.store.coverAlt), taken, size?.width ?? null, size?.height ?? null).run();
  } catch (error) {
    await env.BUCKET!.delete(key);
    throw error;
  }
  return { ok: true, id };
}

/** Makes one photo the cover (position 0); the others keep their order. */
export async function setCover(postId: string, imageId: string): Promise<boolean> {
  const ids = (await listPostPhotos(postId)).map(photo => photo.id);
  const index = ids.indexOf(imageId);
  if (index < 0) return false;
  if (index > 0) {
    ids.splice(index, 1);
    ids.unshift(imageId);
    await env.DB!.batch(ids.map((id, position) => env.DB!.prepare('UPDATE catalog_images SET position = ? WHERE id = ?').bind(position, id)));
  }
  return true;
}

export async function deletePostPhoto(postId: string, imageId: string): Promise<boolean> {
  const row = await env.DB!.prepare("SELECT object_key FROM catalog_images WHERE id = ? AND owner_type = 'content' AND owner_id = ?").bind(imageId, postId).first<{ object_key: string }>();
  if (!row) return false;
  await env.DB!.prepare('DELETE FROM catalog_images WHERE id = ?').bind(imageId).run();
  await env.BUCKET!.delete(row.object_key);
  return true;
}

export async function setPhotoAlt(postId: string, imageId: string, alt: string): Promise<boolean> {
  const result = await env.DB!.prepare("UPDATE catalog_images SET alt = ? WHERE id = ? AND owner_type = 'content' AND owner_id = ?").bind(alt.slice(0, BLOG.store.coverAlt), imageId, postId).run();
  return !!result.meta?.changes;
}

/* ---------- Author photos ---------- */

/** Stores the author's photo (replacing the old one) and returns its id. */
export async function storeAuthorPhoto(authorId: string, bytes: Uint8Array): Promise<Stored> {
  if (bytes.byteLength > 3_000_000) return { ok: false, error: 'Ảnh tác giả tối đa 3 MB.' };
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false, error: 'Không phải ảnh JPG, PNG hoặc WebP.' };
  const size = imageSize(bytes);
  const id = crypto.randomUUID();
  const key = `catalog/author/${authorId}/${id}`;
  await env.BUCKET!.put(key, bytes, { httpMetadata: { contentType: mime } });
  try {
    await env.DB!.prepare("INSERT INTO catalog_images (id, owner_type, owner_id, object_key, mime, alt, position, category, width, height) VALUES (?, 'author', ?, ?, ?, '', 0, 'photo', ?, ?)")
      .bind(id, authorId, key, mime, size?.width ?? null, size?.height ?? null).run();
  } catch (error) { await env.BUCKET!.delete(key); throw error; }
  await removeAuthorPhotos(authorId, id);
  await env.DB!.prepare('UPDATE authors SET photo_id = ? WHERE id = ?').bind(id, authorId).run();
  return { ok: true, id };
}

/** Deletes the author's stored photos except `keep`. */
export async function removeAuthorPhotos(authorId: string, keep = ''): Promise<void> {
  const old = await env.DB!.prepare("SELECT id, object_key FROM catalog_images WHERE owner_type = 'author' AND owner_id = ? AND id != ?").bind(authorId, keep).all<{ id: string; object_key: string }>();
  for (const row of old.results || []) {
    await env.DB!.prepare('DELETE FROM catalog_images WHERE id = ?').bind(row.id).run();
    await env.BUCKET?.delete(row.object_key);
  }
}

/* ---------- Copying a picture from another website into the library ---------- */

/**
 * The address to fetch, or null when it is not safe: https only, the normal port, no login in the address, a real host name
 * (not an IP address, not "localhost" or an internal name). Workers cannot reach private networks anyway; this keeps the
 * request from being aimed at anything that is not an ordinary public website.
 */
export function publicImageUrl(raw: string): URL | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.') || host.includes(':') || host.startsWith('[')) return null;
  if (/^\d+(?:\.\d+){3}$/.test(host) || /^(?:\d+|0x[0-9a-f]+)$/i.test(host.split('.').at(-1) || '')) return null;
  if (/(?:^|\.)(?:localhost|local|internal|localdomain|lan|home|corp|intranet|arpa)$/.test(host)) return null;
  return url;
}

async function readLimited(response: Response, max: number): Promise<Uint8Array | null> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

/** Downloads one picture: up to 3 redirects (each checked again), 8 seconds, at most `max` bytes. */
export async function fetchPublicImage(raw: string, max: number = BLOG.imageBytes): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; error: string }> {
  let url = publicImageUrl(raw);
  if (!url) return { ok: false, error: 'Địa chỉ ảnh không hợp lệ (chỉ nhận https:// của website công khai).' };
  try {
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { Accept: 'image/jpeg,image/png,image/webp' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = publicImageUrl(new URL(response.headers.get('location') || '', url).toString());
        if (!next) return { ok: false, error: 'Ảnh chuyển hướng tới địa chỉ không an toàn.' };
        url = next;
        continue;
      }
      if (!response.ok) return { ok: false, error: `Website trả lỗi ${response.status}.` };
      if (Number(response.headers.get('content-length') || 0) > max) return { ok: false, error: 'Ảnh quá lớn.' };
      const bytes = await readLimited(response, max);
      return bytes ? { ok: true, bytes } : { ok: false, error: 'Ảnh quá lớn.' };
    }
    return { ok: false, error: 'Ảnh chuyển hướng quá nhiều lần.' };
  } catch {
    return { ok: false, error: 'Không tải được ảnh (hết thời gian hoặc website từ chối).' };
  }
}
