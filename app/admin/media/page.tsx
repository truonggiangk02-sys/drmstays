import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { getFreshStaydeskCatalog, getStaydeskCatalog } from '@/lib/staydesk-catalog';
import { contentSections, getEditableContent } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

type Image = { id: string; owner_type: string; owner_id: string; alt: string; category: string };

const sectionNames = { about: 'Giới thiệu', services: 'Dịch vụ', partners: 'Chủ tòa', journal: 'Bài viết', faq: 'Câu hỏi thường gặp' } as const;

function Gallery({ kind, id, images }: { kind: 'building' | 'room' | 'content'; id: string; images: Image[] }) {
  return <div className="media-gallery">
    <form action="/api/admin/catalog-images" method="post" encType="multipart/form-data" className="catalog-upload">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={id} /><input type="hidden" name="returnTo" value="media" />
      {kind !== 'content' && <label>Loại ảnh<select name="category"><option value="photo">Ảnh tòa/phòng</option><option value="floorplan">Sơ đồ mặt bằng</option></select></label>}
      <label>Chọn ảnh JPG, PNG hoặc WebP (tối đa 5 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label>
      <label>Mô tả ảnh<input name="alt" maxLength={150} /></label><button>Tải ảnh lên</button>
    </form>
    {images.length ? <div className="catalog-photo-grid">{images.map((image, index) => <div className="catalog-photo" key={image.id}>
      <img src={`/api/catalog-images/${image.id}`} alt={image.alt || 'Ảnh bất động sản'} />
      <span>{image.category === 'floorplan' ? 'Mặt bằng' : index === 0 ? 'Ảnh bìa' : 'Ảnh'}</span>
      <div>{image.category === 'photo' && <form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={id} /><input type="hidden" name="returnTo" value="media" /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="cover" /><button>Đặt làm ảnh bìa</button></form>}
      <form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={id} /><input type="hidden" name="returnTo" value="media" /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="delete" /><button>Xóa ảnh</button></form></div>
    </div>)}</div> : <p>Chưa có ảnh.</p>}
  </div>;
}

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { open } = await searchParams;
  if (!env.DB || !env.BUCKET) return <AdminShell title="Ảnh & mặt bằng"><p>Kho ảnh chưa sẵn sàng.</p></AdminShell>;
  let buildings: Awaited<ReturnType<typeof getStaydeskCatalog>>['buildings'] = [];
  try { buildings = (await getFreshStaydeskCatalog()).buildings; } catch { /* Content media remains available when Staydesk is offline. */ }
  const [result, content] = await Promise.all([
    env.DB.prepare('SELECT id, owner_type, owner_id, alt, category FROM catalog_images ORDER BY position, id').all<Image>(),
    Promise.all(contentSections.map(async section => ({ section, items: await getEditableContent(section) }))),
  ]);
  const images = result.results || [];
  const forItem = (kind: string, id: string) => images.filter(image => image.owner_type === kind && image.owner_id === id);
  return <AdminShell title="Ảnh & mặt bằng">
    <p className="admin-hint">Mỗi ảnh được lưu riêng cho tòa, phòng hoặc mục nội dung bạn chọn. Bạn có thể đặt ảnh bìa và xóa ảnh; tối đa 20 ảnh mỗi mục.</p>
    <nav className="media-jump"><a href="#media-buildings">Ảnh tòa nhà</a><a href="#media-rooms">Ảnh phòng</a><a href="#media-content">Ảnh bài viết & nội dung</a></nav>
    <h2 id="media-buildings">Tòa nhà</h2>
    {buildings.map(building => <section className="media-building" key={building.id} id={`item-${building.id}`}>
      <h2>{building.name} — tòa nhà</h2><Gallery kind="building" id={building.id} images={forItem('building', building.id)} />
    </section>)}
    {!buildings.length && <p>Chưa lấy được danh sách tòa/phòng từ Staydesk.</p>}
    <h2 id="media-rooms">Phòng</h2>
    {buildings.flatMap(building => building.rooms.map(room => <details className="media-room media-building" key={room.id} id={`item-${room.id}`} open={open === room.id}><summary>{room.name} · {building.name} ({forItem('room', room.id).length} ảnh)</summary><Gallery kind="room" id={room.id} images={forItem('room', room.id)} /></details>))}
    <h2 id="media-content">Bài viết & nội dung website</h2>
    {content.map(({ section, items }) => <section className="media-content-group" key={section}><h3>{sectionNames[section]}</h3>{items.map(item => <details className="media-room media-building" key={item.id} id={`item-${item.id}`} open={open === item.id}><summary>{item.title_vi} ({forItem('content', item.id).length} ảnh)</summary><Gallery kind="content" id={item.id} images={forItem('content', item.id)} /></details>)}</section>)}
  </AdminShell>;
}
