import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { JournalEditor, type EditorFields } from '@/components/journal-editor';
import { isAdmin } from '@/lib/admin';
import { getAuthors } from '@/lib/authors';
import { isStatus } from '@/lib/blog-standard';
import { getJournalRows } from '@/lib/journal';
import { listPostPhotos } from '@/lib/journal-images';
import { getPublicCatalog } from '@/lib/public-catalog';

export const dynamic = 'force-dynamic';

const STATIC_PATHS = ['/en', '/en/stays', '/en/room-types', '/en/services', '/en/about', '/en/faq', '/en/contact', '/en/partners', '/en/monthly-rent', '/en/journal', '/en/privacy', '/en/cancellation', '/en/terms'];

/** The editor for one post (?id=…) or a new one. Loads what the checks need: other posts, the real prices, the pages that exist. */
export default async function JournalEdit({ searchParams }: { searchParams: Promise<{ id?: string; paste?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { id: requested, paste } = await searchParams;
  if (requested && !/^[0-9a-f-]{36}$/i.test(requested)) redirect('/admin/journal');
  const [rows, authors, catalog] = await Promise.all([getJournalRows().catch(() => []), getAuthors(), getPublicCatalog(undefined, undefined, 'en').catch(() => null)]);
  const row = requested ? rows.find(item => item.id === requested) : undefined;
  const id = row?.id || requested || crypto.randomUUID();
  const photos = row ? await listPostPhotos(id).catch(() => []) : [];

  // Real prices (room types, rooms, deposits) for the "is this amount true?" check, and every address that opens on the site.
  const buildings = catalog?.buildings || [];
  const prices = new Set<number>();
  const paths = new Set<string>(STATIC_PATHS);
  for (const building of buildings) {
    paths.add(`/en/buildings/${building.id}`);
    for (const type of building.types) { paths.add(`/en/types/${type.id}`); [type.priceFrom, type.depositVnd, ...type.rooms.map(room => room.monthlyPrice)].forEach(value => value && value > 0 && prices.add(value)); }
    for (const room of building.rooms) { paths.add(`/en/rooms/${room.id}`); [room.monthlyPrice, room.depositVnd].forEach(value => value && value > 0 && prices.add(value)); }
  }
  for (const post of rows) if (post.published === 1 && post.slug) paths.add(`/en/journal/${post.slug}`);

  const today = new Date().toISOString().slice(0, 10);
  const initial: EditorFields = {
    h1: row?.title_en || '', seoTitle: row?.seo_title_en || '', meta: row?.excerpt_en || '', slug: row?.slug || '', keyword: row?.primary_keyword || '', variations: row?.keyword_variations || '',
    intent: row?.search_intent || '', template: row?.post_template || '', level: row?.post_level || '', topic: row?.topic || '', authorId: row?.author_id || '',
    date: row?.published_at || today, body: row?.body_en || '', coverAlt: row?.cover_alt_en || '', titleVi: row?.title_vi || '', metaVi: row?.excerpt_vi || '', bodyVi: row?.body_vi || '',
  };
  let reviews: boolean[] = [];
  try { const parsed: unknown = JSON.parse(row?.checks_json || '[]'); if (Array.isArray(parsed)) reviews = parsed.map(item => item === true); } catch { /* none ticked */ }
  const status = row && isStatus(row.status) ? row.status : 'draft';

  return <AdminShell title={row ? 'Sửa bài' : 'Viết bài mới'}>
    <JournalEditor
      key={id} id={id} openPaste={paste === '1' && !row} isNew={!row} status={status} everLive={!!row && (status === 'published' || !!row.checked_at)} initial={initial} reviews={reviews} checkedAt={row?.checked_at || ''}
      authors={authors} others={rows.map(item => ({ id: item.id, slug: item.slug, h1: item.title_en, keyword: item.primary_keyword, status: item.status }))}
      knownPrices={[...prices]} knownPaths={[...paths]} photos={photos}
    />
  </AdminShell>;
}
