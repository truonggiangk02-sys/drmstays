import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { contentSections, getEditableContent, getDeletedContent, type ContentItem, type ContentSection } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

const labels = { about: 'Giới thiệu công ty', services: 'Dịch vụ', partners: 'Dành cho chủ tòa', journal: 'Bài viết', faq: 'Câu hỏi thường gặp' } as const;

function ContentForm({ section, item, nextPosition, autoAvailable }: { section: ContentSection; item?: ContentItem; nextPosition?: number; autoAvailable: boolean }) {
  const isNew = !item;
  return <form action="/api/admin/content" method="post">
    {item && <input type="hidden" name="id" value={item.id} />}
    <input type="hidden" name="section" value={section} /><input type="hidden" name="action" value={isNew ? 'create' : 'save'} />
    <label>Tiêu đề tiếng Việt<input name="titleVi" defaultValue={item?.title_vi} required maxLength={180} /></label>
    <label>Nội dung tiếng Việt<textarea name="bodyVi" defaultValue={item?.body_vi} rows={5} /></label>
    <label className="catalog-check"><input type="checkbox" name="autoTranslate" defaultChecked={autoAvailable} disabled={!autoAvailable} /> Tự dịch sang tiếng Anh khi lưu {!autoAvailable && '(chưa cấu hình)'}</label>
    <details className="translation-review"><summary>Xem hoặc chỉnh bản tiếng Anh</summary>
      <p>Bỏ chọn “Tự dịch” ở trên nếu bạn muốn giữ bản tiếng Anh tự sửa.</p>
      <label>English title<input name="titleEn" defaultValue={item?.title_en} maxLength={180} /></label>
      <label>English content<textarea name="bodyEn" defaultValue={item?.body_en} rows={5} /></label>
    </details>
    <label>Thứ tự<input type="number" name="position" min="0" max="1000" defaultValue={item?.position ?? nextPosition ?? 0} /></label>
    {!isNew && <label className="catalog-check"><input type="checkbox" name="published" defaultChecked={item?.published === 1} /> Hiển thị trên website</label>}
    <button>{isNew ? 'Thêm nội dung' : 'Lưu nội dung'}</button>
  </form>;
}

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { error } = await searchParams;
  const sections = await Promise.all(contentSections.map(async section => ({ section, items: await getEditableContent(section), deleted: await getDeletedContent(section) })));
  return <AdminShell title="Website content">
    <p className="admin-hint">Nhập nội dung tiếng Việt; khi dịch tự động được cấu hình, hệ thống tạo bản tiếng Anh lúc lưu. Bạn có thể mở phần tiếng Anh để xem và sửa bản dịch. Mỗi mục có thể ẩn, sửa hoặc xóa.</p>
    {!env.OPENAI_API_KEY && <p className="translation-error" role="status">Chức năng tự dịch chưa được bật vì Site chưa có khóa dịch. Hiện bạn vẫn có thể bỏ qua tính năng này và nhập bản tiếng Anh thủ công. Để bật tự dịch, thêm OPENAI_API_KEY dạng Secret trong Site Settings → Environment variables.</p>}
    {error === 'translation' && <p className="translation-error" role="alert">Chưa dịch được sang tiếng Anh. Nội dung chưa được lưu. Cần cấu hình khóa dịch trong Site Settings → Environment variables, hoặc bỏ chọn tự dịch và nhập bản tiếng Anh thủ công.</p>}
    {sections.map(({ section, items }) => <section key={section} className="content-admin-section">
      <h2>{labels[section]}</h2>
      {items.map(item => <article key={item.id} className="content-admin-item"><Link className="media-edit-link" href={`/admin/media?open=${item.id}#item-${item.id}`}>Tải ảnh cho mục này ↗</Link><ContentForm section={section} item={item} autoAvailable={!!env.OPENAI_API_KEY} />
        <form action="/api/admin/content" method="post"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="section" value={section} /><input type="hidden" name="action" value="delete" /><button className="content-delete" aria-label={`Xóa ${item.title_vi}`}>Xóa</button></form>
      </article>)}
      <details className="content-admin-new"><summary>Thêm mục vào {labels[section]}</summary><ContentForm section={section} nextPosition={items.length + 1} autoAvailable={!!env.OPENAI_API_KEY} /></details>
    </section>)}
    {sections.map(({ section, deleted }) => deleted.length > 0 && <details className="content-admin-new" key={`${section}-deleted`}><summary>Đã xóa: {labels[section]} ({deleted.length})</summary>{deleted.map(item => <form key={item.id} action="/api/admin/content" method="post"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="section" value={section} /><input type="hidden" name="action" value="restore" /><span>{item.title_vi}</span><button>Khôi phục</button></form>)}</details>)}
  </AdminShell>;
}
