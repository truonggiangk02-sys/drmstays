import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { JournalEditor, type EditorFields } from '@/components/journal-editor';
import type { LinkChoice } from '@/components/journal-toolbar';
import { isAdmin } from '@/lib/admin';
import { getAuthors } from '@/lib/authors';
import { isStatus } from '@/lib/blog-standard';
import { getJournalRows } from '@/lib/journal';
import { listPostPhotos } from '@/lib/journal-images';
import { getPublicCatalog } from '@/lib/public-catalog';
import { propertyName } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** The pages the "Link" box offers first, with the names the reviewer knows them by. */
const MAIN_PAGES: LinkChoice[] = [
  { path: '/en/stays', label: 'Buildings and rooms', group: 'Trang chính' }, { path: '/en/monthly-rent', label: 'Monthly rent and costs', group: 'Trang chính' },
  { path: '/en/room-types', label: 'Featured room types', group: 'Trang chính' }, { path: '/en/services', label: 'Services', group: 'Trang chính' },
  { path: '/en/about', label: 'About DRM Stays', group: 'Trang chính' }, { path: '/en/faq', label: 'FAQ', group: 'Trang chính' },
  { path: '/en/contact', label: 'Contact', group: 'Trang chính' }, { path: '/en/partners', label: 'For investors', group: 'Trang chính' }, { path: '/en/journal', label: 'Journal (all guides)', group: 'Trang chính' },
];

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
  const links: LinkChoice[] = [
    ...MAIN_PAGES,
    ...buildings.map(building => ({ path: `/en/buildings/${building.id}`, label: propertyName(building.name), group: 'Tòa nhà' })),
    ...buildings.flatMap(building => building.types.map(type => ({ path: `/en/types/${type.id}`, label: `${type.name} (${propertyName(building.name)})`, group: 'Loại phòng' }))),
    ...buildings.flatMap(building => building.rooms.map(room => ({ path: `/en/rooms/${room.id}`, label: `${room.name} (${propertyName(building.name)})`, group: 'Phòng' }))),
    ...rows.filter(post => post.published === 1 && post.slug && post.id !== id && post.title_en).map(post => ({ path: `/en/journal/${post.slug}`, label: post.title_en, group: 'Bài viết khác' })),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const initial: EditorFields = {
    h1: row?.title_en || '', seoTitle: row?.seo_title_en || '', meta: row?.excerpt_en || '', slug: row?.slug || '', keyword: row?.primary_keyword || '', variations: row?.keyword_variations || '',
    intent: row?.search_intent || '', template: row?.post_template || '', level: row?.post_level || '', topic: row?.topic || '',
    // A new post starts with the author already chosen when there is only one (the marketing team).
    authorId: row ? row.author_id : authors.length === 1 ? authors[0].id : '',
    date: row?.published_at || today, body: row?.body_en || '', coverAlt: row?.cover_alt_en || '', titleVi: row?.title_vi || '', metaVi: row?.excerpt_vi || '', bodyVi: row?.body_vi || '',
  };
  let reviews: boolean[] = [];
  try { const parsed: unknown = JSON.parse(row?.checks_json || '[]'); if (Array.isArray(parsed)) reviews = parsed.map(item => item === true); } catch { /* none ticked */ }
  const status = row && isStatus(row.status) ? row.status : 'draft';

  return <AdminShell title={row ? 'Sửa bài' : 'Viết bài mới'}>
    <JournalEditor
      key={id} id={id} openPaste={paste === '1' && !row} isNew={!row} status={status} everLive={!!row && (status === 'published' || !!row.checked_at)} initial={initial} reviews={reviews} checkedAt={row?.checked_at || ''}
      authors={authors} links={links} others={rows.map(item => ({ id: item.id, slug: item.slug, h1: item.title_en, keyword: item.primary_keyword, status: item.status }))}
      knownPrices={[...prices]} knownPaths={[...paths]} photos={photos}
    />
  </AdminShell>;
}
