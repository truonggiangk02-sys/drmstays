import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import '../../../catalog-admin.css';
import { AdminShell } from '@/components/admin-shell';
import { CatalogPhotos, type CatalogImageRow } from '@/components/catalog-photos';
import { isAdmin } from '@/lib/admin';
import { HOME_SECTIONS, HOME_SLOTS, HOME_TEXT, getHomeContent } from '@/lib/home-content';

export const dynamic = 'force-dynamic';

export default async function HomeEditorPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB) return <AdminShell title="Trang chủ"><p>Database unavailable.</p></AdminShell>;
  const query = await searchParams;
  const [vi, en] = await Promise.all([getHomeContent('vi'), getHomeContent('en')]);
  let missingTable = false;
  const photos: CatalogImageRow[] = [];
  try {
    const rows = await env.DB.prepare("SELECT id, owner_type, owner_id, alt, category FROM catalog_images WHERE owner_type = 'home' ORDER BY position, id").all<CatalogImageRow>();
    photos.push(...(rows.results || []));
    await env.DB.prepare('SELECT 1 FROM home_texts LIMIT 1').first();
  } catch { missingTable = true; }

  return <AdminShell title="Trang chủ">
    {query.saved === '1' && <p className="cx-flash" role="status">Đã lưu. Mở trang chủ để xem thay đổi.</p>}
    {missingTable && <p className="cx-flash" role="alert">Chưa áp dụng migration <strong>0015_home_content</strong>. Deploy với -Migrate (Windows) hoặc --migrate (Mac) rồi tải lại trang.</p>}
    <p className="admin-hint">Sửa chữ và ảnh của trang chủ. <strong>Ô để trống = dùng chữ mặc định</strong> (hiện mờ trong ô). Mỗi khu vực ảnh để trống thì trang chủ tự lấy ảnh của các tòa nhà. Các trang khác (Về chúng tôi, Dịch vụ, Cẩm nang, FAQ) sửa ở mục <strong>Website content</strong>.</p>

    <div className="hm-form">
      {HOME_SECTIONS.map(section => <section className="hm-card" id={section.id} key={section.id}>
        <h2>{section.title}</h2><p className="hm-hint">{section.hint}</p>
        {section.slot && <div className="hm-photos" id={section.slot}>
          <h3>Ảnh: {HOME_SLOTS[section.slot].label}</h3>
          <p className="hm-hint">{HOME_SLOTS[section.slot].max === 1 ? 'Một ảnh: tải ảnh mới sẽ thay ảnh cũ.' : `Tối đa ${HOME_SLOTS[section.slot].max} ảnh.`} Ảnh được lưu ngay khi tải lên. Chưa có ảnh nào ở đây thì trang chủ dùng ảnh tự động của các tòa.</p>
          <CatalogPhotos kind="home" sourceId={section.slot} images={photos.filter(photo => photo.owner_id === section.slot)} allowRemove={false} plans={false} />
        </div>}
        <form action="/api/admin/home" method="post" data-save-in-place="">
          <h3>Chữ</h3>
          {section.fields.map(field => <div className="cx-pair" key={field.key}><h4>{field.label}</h4><div>
            {(['vi', 'en'] as const).map(lang => <label className="cx-field" key={lang}><span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
              {field.long ? <textarea name={`${field.key}.${lang}`} rows={3} defaultValue={(lang === 'vi' ? vi : en).overrides[field.key] || ''} placeholder={HOME_TEXT[lang][field.key]} /> : <input name={`${field.key}.${lang}`} defaultValue={(lang === 'vi' ? vi : en).overrides[field.key] || ''} placeholder={HOME_TEXT[lang][field.key]} />}</label>)}
          </div></div>)}
          <div className="cx-savebar"><button type="submit">Lưu chữ phần này</button><small>Ô để trống = dùng chữ mặc định.</small></div>
        </form>
      </section>)}
    </div>
  </AdminShell>;
}
