'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BLOG, INTENTS, LEVELS, REVIEW_ITEMS, STATUSES, TEMPLATES, TOPICS, type Status } from '@/lib/blog-standard';
import { blockers, chars, checkPost, findVndAmounts, summary, type BlogContext, type BlogDraft, type Check } from '@/lib/blog-check';
import { parsePastedPost, type PostFields } from '@/lib/blog-frontmatter';
import { bodyWords, countTextWords, markdownLinks, mediaImageId, slugify } from '@/lib/journal-markdown';
import type { JournalPost } from '@/lib/journal';
import type { Author } from '@/lib/authors';

/* The journal editor: form on the left; on the right the standard's checks (live), the Google preview and the page preview. */

export type EditorPhoto = { id: string; url: string; alt: string; width?: number; height?: number };
export type EditorFields = {
  h1: string; seoTitle: string; meta: string; slug: string; keyword: string; variations: string; intent: string; template: string; level: string; topic: string;
  authorId: string; date: string; body: string; coverAlt: string; titleVi: string; metaVi: string; bodyVi: string;
};

type Props = {
  id: string; isNew: boolean; openPaste?: boolean; status: Status; everLive: boolean; initial: EditorFields; reviews: boolean[]; checkedAt: string;
  authors: Array<Pick<Author, 'id' | 'name' | 'role' | 'bio' | 'photo_id' | 'url' | 'kind'>>; others: BlogContext['others']; knownPrices: number[]; knownPaths: string[]; photos: EditorPhoto[];
};

const tabs = [['checks', 'Kiểm tra'], ['google', 'Google'], ['page', 'Xem trước trang'], ['money', 'Số tiền VND']] as const;
type Tab = (typeof tabs)[number][0];

/** Shrinks big phone photos in the browser before upload (the server accepts up to 8 MB). */
async function shrink(file: File): Promise<File> {
  if (file.size <= 3_500_000 || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const good = value >= min && value <= max;
  return <span className={`je-count ${good ? 'is-ok' : 'is-bad'}`} aria-live="polite">{value} / {min}–{max}</span>;
}

export function JournalEditor(props: Props) {
  const [f, setF] = useState<EditorFields>(props.initial);
  const [status, setStatus] = useState<Status>(props.status);
  const [saved, setSaved] = useState(!props.isNew);
  const [everLive, setEverLive] = useState(props.everLive);
  const [serverSlug, setServerSlug] = useState(props.initial.slug);
  const [dirty, setDirty] = useState(false);
  const [reviews, setReviews] = useState<boolean[]>(props.reviews.length === REVIEW_ITEMS.length ? props.reviews : REVIEW_ITEMS.map(() => false));
  const [photos, setPhotos] = useState<EditorPhoto[]>(props.photos);
  const [tab, setTab] = useState<Tab>('checks');
  const [phone, setPhone] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [unlockSlug, setUnlockSlug] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(!!props.openPaste);
  const [checks, setChecks] = useState<Check[]>([]);
  const slugTouched = useRef(props.initial.slug !== '');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(540);
  const [frameReady, setFrameReady] = useState(false);

  const published = status === 'published';
  const slugLocked = everLive && !unlockSlug;

  function edit(patch: Partial<EditorFields>) {
    setF(current => {
      const next = { ...current, ...patch };
      // The address follows the keyword (or the H1) until someone types one, and never moves once the post has been live.
      if (!slugTouched.current && !everLive && ('h1' in patch || 'keyword' in patch)) next.slug = slugify(next.keyword || next.h1).split('-').slice(0, BLOG.slug.maxWords).join('-');
      return next;
    });
    setDirty(true);
    setReviews(REVIEW_ITEMS.map(() => false)); // anything changed after the ticks: the reviewer ticks again
  }

  const ctx = useMemo<BlogContext>(() => ({ selfId: props.id, others: props.others, knownPrices: props.knownPrices, knownPaths: props.knownPaths }), [props.id, props.others, props.knownPrices, props.knownPaths]);
  const draft: BlogDraft = { h1: f.h1, seoTitle: f.seoTitle, meta: f.meta, slug: f.slug, keyword: f.keyword, variations: f.variations, intent: f.intent, template: f.template, level: f.level, topic: f.topic, authorId: f.authorId, body: f.body, coverAlt: f.coverAlt, hasCover: photos.length > 0 };

  // Checks run half a second after the last keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setChecks(checkPost({ ...draft }, ctx)), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, photos, ctx]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // The page preview is an iframe with a real screen width: the editor sends it the draft whenever it changes.
  useEffect(() => {
    const ready = (event: MessageEvent) => { if (event.origin === window.location.origin && event.data?.type === 'journal-preview-ready') setFrameReady(true); };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, []);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setBoxWidth(box.clientWidth || 540));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // The article box grows with the text (no scrolling inside it): the page scrolls, and the checks on the right stay in view.
  useEffect(() => {
    const grow = () => { const area = bodyRef.current; if (!area) return; area.style.height = 'auto'; area.style.height = `${Math.max(area.scrollHeight + 4, 520)}px`; };
    grow();
    window.addEventListener('resize', grow);
    return () => window.removeEventListener('resize', grow);
  }, [f.body]);

  const counts = summary(checks);
  const blocking = blockers(checks);
  const allTicked = reviews.every(Boolean);
  const words = bodyWords(f.body);
  const wordCount = checks.length ? words : countTextWords(f.body);

  async function send(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action); setMessage(null);
    try {
      const response = await fetch('/api/admin/journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: props.id, action, ...f, reviews, confirmSlugChange: confirmSlug, ...extra }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; status?: Status | 'deleted'; slug?: string; checks?: Check[]; notice?: string };
      if (!response.ok) { setMessage({ kind: 'error', text: data.error || 'Không thực hiện được.' }); if (data.checks) setChecks(data.checks); return false; }
      if (data.status === 'deleted') { window.location.assign('/admin/journal?saved=deleted'); return true; }
      if (data.status) setStatus(data.status);
      if (data.slug) { setServerSlug(data.slug); setF(current => ({ ...current, slug: data.slug! })); }
      if (['ready', 'publish', 'update'].includes(action) || data.status === 'published') setEverLive(value => value || data.status === 'published');
      if (action === 'publish' || action === 'update') setEverLive(true);
      setSaved(true); setDirty(false); setUnlockSlug(false); setConfirmSlug(false);
      if (action === 'unpublish' || action === 'archive' || action === 'unarchive') setReviews(REVIEW_ITEMS.map(() => false));
      const url = new URL(window.location.href);
      if (url.searchParams.get('id') !== props.id) { url.searchParams.set('id', props.id); window.history.replaceState(null, '', url); }
      const done: Record<string, string> = { save: 'Đã lưu nháp.', ready: 'Đã đánh dấu sẵn sàng. Tích đủ các ô người duyệt rồi bấm Đăng.', publish: 'Đã đăng bài.', update: 'Đã cập nhật bài đã đăng.', unpublish: 'Đã gỡ bài xuống (về nháp).', archive: 'Đã lưu trữ.', unarchive: 'Đã khôi phục về nháp.' };
      setMessage({ kind: 'ok', text: `${done[action] || 'Xong.'}${data.notice ? ` ${data.notice}` : ''}` });
      return true;
    } catch { setMessage({ kind: 'error', text: 'Mất kết nối. Thử lại.' }); return false; }
    finally { setBusy(''); }
  }

  /** A photo can only be added to a post that exists: save a draft first when it is new. */
  async function ensureSaved() { return saved || (await send('save')); }

  async function callPhotos(form: FormData): Promise<{ photos?: EditorPhoto[]; added?: Array<{ id: string; url?: string }>; failed?: string[]; error?: string }> {
    form.set('postId', props.id);
    const response = await fetch('/api/admin/journal-images', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({})) as { photos?: EditorPhoto[]; added?: Array<{ id: string; url?: string }>; failed?: string[]; error?: string };
    if (data.photos) setPhotos(data.photos);
    return data;
  }

  function insert(text: string, selectInside = false) {
    const area = bodyRef.current;
    const start = area?.selectionStart ?? f.body.length, end = area?.selectionEnd ?? f.body.length;
    const next = f.body.slice(0, start) + text + f.body.slice(end);
    edit({ body: next });
    requestAnimationFrame(() => {
      if (!area) return;
      area.focus();
      const at = selectInside ? start + text.indexOf('(') + 1 : start + text.length;
      area.setSelectionRange(at, selectInside ? at + 8 : at);
    });
  }

  function wrapLink() {
    const area = bodyRef.current;
    const start = area?.selectionStart ?? f.body.length, end = area?.selectionEnd ?? f.body.length;
    const label = f.body.slice(start, end) || 'link text';
    insert(`[${label}](https://drmstays.vn/en/)`, true);
  }

  function jump(check: Check) {
    if (check.field === 'body' && check.offset !== undefined && bodyRef.current) {
      const area = bodyRef.current;
      area.focus({ preventScroll: true });
      area.setSelectionRange(check.offset, check.offset);
      // The box is as tall as the text, so the spot is found by its share of the text, then the page is scrolled there.
      const top = area.getBoundingClientRect().top + window.scrollY + (check.offset / Math.max(1, f.body.length)) * area.scrollHeight;
      window.scrollTo({ top: Math.max(0, top - window.innerHeight / 3), behavior: 'smooth' });
      return;
    }
    const target = check.field === 'choices' ? 'jf-template' : check.field ? `jf-${check.field}` : '';
    const element = target ? document.getElementById(target) : null;
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element?.focus();
  }

  const author = props.authors.find(item => item.id === f.authorId) || null;
  const previewPost: JournalPost = {
    id: props.id, slug: f.slug, lang: 'en', title: f.h1 || 'Untitled', excerpt: f.meta, body: f.body, publishedAt: f.date, updatedAt: f.date, languages: ['en'], seoTitle: f.seoTitle || f.h1,
    keyword: f.keyword, variations: [], topic: (f.topic || '') as JournalPost['topic'], template: (f.template || '') as JournalPost['template'], level: (f.level || '') as JournalPost['level'],
    intent: (f.intent || '') as JournalPost['intent'], authorId: f.authorId, status, words,
  };

  useEffect(() => {
    if (frameReady) frameRef.current?.contentWindow?.postMessage({ type: 'journal-preview', post: previewPost, images: photos, author }, window.location.origin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameReady, f, photos, status, phone]);

  const seoShown = `${f.seoTitle}${BLOG.suffix}`;
  const cut = (text: string, max: number) => (chars(text) > max ? `${[...text].slice(0, max - 1).join('').trimEnd()}…` : text);
  const amounts = useMemo(() => findVndAmounts(f.body, props.knownPrices), [f.body, props.knownPrices]);

  const publishReason = status !== 'ready' ? 'Hãy bấm "Đánh dấu sẵn sàng" trước.' : dirty ? 'Có thay đổi chưa lưu: bấm "Đánh dấu sẵn sàng" lại.' : blocking.length ? `Còn ${blocking.length} lỗi chặn.` : !allTicked ? `Chưa tích đủ ${REVIEW_ITEMS.length} ô của người duyệt.` : '';
  const readyReason = published ? '' : saved && !dirty && status === 'ready' ? '' : blocking.length ? `Còn ${blocking.length} lỗi chặn.` : '';
  const updateReason = !dirty ? 'Chưa có thay đổi.' : blocking.length ? `Còn ${blocking.length} lỗi chặn.` : slugLocked || serverSlug === f.slug || confirmSlug ? '' : 'Xác nhận đổi địa chỉ.';

  const field = (key: keyof EditorFields) => ({ id: `jf-${key}`, value: f[key], onChange: (event: { target: { value: string } }) => edit({ [key]: event.target.value } as Partial<EditorFields>) });

  async function uploadFiles(files: File[], description: string) {
    if (!description.trim()) { setMessage({ kind: 'error', text: 'Nhập mô tả ảnh trước khi tải lên.' }); return false; }
    if (!(await ensureSaved())) return false;
    setBusy('upload');
    try {
      const form = new FormData();
      form.set('action', 'upload'); form.set('alt', description);
      for (const file of files) form.append('image', await shrink(file));
      const data = await callPhotos(form);
      setMessage(data.failed?.length ? { kind: 'error', text: data.failed.join(' · ') } : data.error ? { kind: 'error', text: data.error } : { kind: 'ok', text: 'Đã tải ảnh lên.' });
      return !data.error && !data.failed?.length;
    } finally { setBusy(''); }
  }

  async function photoAction(action: 'cover' | 'delete' | 'alt', imageId: string, alt = '') {
    setBusy(action);
    try {
      const form = new FormData();
      form.set('action', action); form.set('imageId', imageId); form.set('alt', alt);
      const data = await callPhotos(form);
      if (data.error) setMessage({ kind: 'error', text: data.error });
    } finally { setBusy(''); }
  }

  async function importPictures(urls: Array<{ url: string; alt: string }>) {
    if (!(await ensureSaved())) return;
    setBusy('import');
    try {
      const form = new FormData();
      form.set('action', 'import');
      for (const item of urls) { form.append('url', item.url); form.append('alt', item.alt); }
      const data = await callPhotos(form);
      let body = f.body;
      for (const item of data.added || []) if (item.url) body = body.split(`](${item.url})`).join(`](/media/catalog/${item.id})`);
      if (body !== f.body) edit({ body });
      setMessage(data.failed?.length ? { kind: 'error', text: `Một số ảnh không tải được: ${data.failed.join(' · ')}` } : { kind: 'ok', text: `Đã tải ${data.added?.length || 0} ảnh về website và sửa link trong bài.` });
    } finally { setBusy(''); }
  }

  function applyPaste(text: string): string {
    const result = parsePastedPost(text);
    const patch: Partial<EditorFields> = { body: result.body };
    const map: Array<[keyof PostFields, keyof EditorFields]> = [['h1', 'h1'], ['seoTitle', 'seoTitle'], ['meta', 'meta'], ['slug', 'slug'], ['keyword', 'keyword'], ['variations', 'variations'], ['intent', 'intent'], ['template', 'template'], ['level', 'level'], ['topic', 'topic'], ['date', 'date'], ['coverAlt', 'coverAlt']];
    for (const [from, to] of map) if (result.fields[from]) patch[to] = result.fields[from]!;
    if (patch.slug) slugTouched.current = true;
    if (result.fields.keyword && !patch.keyword) patch.keyword = '';
    const notes: string[] = [];
    if (result.fields.author) {
      const match = props.authors.find(item => item.name.trim().toLowerCase() === result.fields.author!.trim().toLowerCase());
      if (match) patch.authorId = match.id; else notes.push(`Không có tác giả "${result.fields.author}" trong danh sách: hãy thêm ở mục Tác giả rồi chọn lại.`);
    }
    if (patch.keyword) patch.keyword = patch.keyword.toLowerCase();
    edit(patch);
    if (!result.hadHead) notes.push('Bài dán vào không có khối thông tin ở đầu (giữa hai dòng ---): chỉ điền nội dung.');
    if (result.unknownKeys.length) notes.push(`Bỏ qua trường lạ: ${result.unknownKeys.join(', ')}.`);
    if (result.invalid.length) notes.push(`Giá trị không hợp lệ, để trống: ${result.invalid.join(', ')}.`);
    if (result.externalImages.length) notes.push(`${result.externalImages.length} ảnh nằm ở website khác: bấm “Tải ảnh ngoài về website” bên dưới nội dung.`);
    return `Đã điền ${Object.keys(result.fields).length} trường và nội dung.${notes.length ? ` ${notes.join(' ')}` : ''}`;
  }

  const externalPictures = markdownLinks(f.body).filter(link => link.image && /^https:\/\//i.test(link.url) && !mediaImageId(link.url));
  const group = (level: Check['level']) => checks.filter(check => check.level === level);

  return <div className="je">
    <header className="je-bar">
      <div><span className={`je-status is-${status}`}>{STATUSES[status]}{dirty && ' · chưa lưu'}</span> <strong>{f.h1 || 'Bài mới'}</strong></div>
      <div className="je-bar-actions">
        {published && <a className="je-link" href={`/en/journal/${serverSlug}`} target="_blank" rel="noreferrer">Xem bài trên web ↗</a>}
        <Link className="je-link" href="/admin/journal" prefetch={false}>← Danh sách</Link>
      </div>
    </header>
    {message && <p className={`je-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
    <div className="je-grid">
      <div className="je-form">
        <section className="je-card">
          <div className="je-row"><h2>Bài viết</h2><button type="button" className="je-ghost" onClick={() => setPasteOpen(open => !open)}>Dán cả bài</button></div>
          {pasteOpen && <PasteBox onApply={applyPaste} onClose={() => setPasteOpen(false)} />}
          <label>H1 (tiêu đề trang) <Counter value={chars(f.h1)} min={BLOG.h1.min} max={BLOG.h1.max} /><input {...field('h1')} maxLength={BLOG.store.h1} /></label>
          <label>Tiêu đề Google <Counter value={chars(f.seoTitle)} min={BLOG.seoTitle.min} max={BLOG.seoTitle.max} /><input {...field('seoTitle')} maxLength={BLOG.store.seoTitle} /><small>Website tự thêm “{BLOG.suffix}” sau tiêu đề này.</small></label>
          <label>Mô tả Google <Counter value={chars(f.meta)} min={BLOG.meta.min} max={BLOG.meta.max} /><textarea {...field('meta')} rows={3} maxLength={BLOG.store.meta} /></label>
          <label>Địa chỉ bài <input {...field('slug')} maxLength={BLOG.store.slug} readOnly={slugLocked} onChange={event => { slugTouched.current = true; edit({ slug: event.target.value.toLowerCase() }); }} />
            <small>/en/journal/{f.slug || '…'}{slugLocked && ' · đã khóa vì bài từng đăng.'}</small></label>
          {everLive && <div className="je-slug">
            {slugLocked ? <button type="button" className="je-ghost" onClick={() => setUnlockSlug(true)}>Mở khóa để đổi địa chỉ</button>
              : <label className="je-check"><input type="checkbox" checked={confirmSlug} onChange={event => setConfirmSlug(event.target.checked)} /> Tôi hiểu: đổi địa chỉ thì link cũ sẽ chuyển hướng (301) sang địa chỉ mới.</label>}
          </div>}
        </section>
        <section className="je-card">
          <h2>Từ khóa và phân loại</h2>
          <label>Từ khóa chính<input {...field('keyword')} maxLength={BLOG.store.keyword} placeholder="where to stay in da nang" /></label>
          <label>Biến thể từ khóa (ngăn cách bằng dấu ;)<input {...field('variations')} maxLength={BLOG.store.variations} /></label>
          <div className="je-two">
            <label>Mẫu bài<select {...field('template')}><option value="">— chọn —</option>{Object.entries(TEMPLATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Mức (độ dài)<select {...field('level')}><option value="">— chọn —</option>{Object.entries(LEVELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Ý định tìm kiếm<select {...field('intent')}><option value="">— chọn —</option>{Object.entries(INTENTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Chủ đề<select {...field('topic')}><option value="">— chọn —</option>{Object.entries(TOPICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Tác giả<select {...field('authorId')}><option value="">— chọn —</option>{props.authors.map(item => <option key={item.id} value={item.id}>{item.name}{item.role && ` · ${item.role}`}</option>)}</select>
              {!props.authors.length && <small>Chưa có tác giả: thêm ở mục Tác giả trong danh sách bài.</small>}</label>
            <label>Ngày đăng<input type="date" {...field('date')} /></label>
          </div>
        </section>
        <section className="je-card">
          <div className="je-row"><h2>Nội dung (tiếng Anh, Markdown)</h2><span className="je-count is-neutral">{wordCount} từ</span></div>
          <div className="je-tools" role="toolbar" aria-label="Chèn nhanh">
            <button type="button" onClick={() => insert('\n\n## Heading\n\n')}>H2</button>
            <button type="button" onClick={() => insert('\n\n### Heading\n\n')}>H3</button>
            <button type="button" onClick={() => insert('\n- item\n- item\n- item\n')}>Danh sách</button>
            <button type="button" onClick={() => insert('\n\n| Column | Column |\n| --- | --- |\n| Text | Text |\n\n')}>Bảng</button>
            <button type="button" onClick={wrapLink}>Link</button>
          </div>
          <textarea ref={bodyRef} id="jf-body" className="je-body" value={f.body} rows={26} maxLength={BLOG.store.body} onChange={event => edit({ body: event.target.value })} spellCheck />
          {externalPictures.length > 0 && <div className="je-note"><p>{externalPictures.length} ảnh trong bài nằm ở website khác. Ảnh ngoài sẽ không hiện: hãy tải về website của mình.</p>
            <button type="button" disabled={!!busy} onClick={() => importPictures(externalPictures.map(link => ({ url: link.url, alt: link.text })))}>Tải ảnh ngoài về website</button></div>}
        </section>
        <section className="je-card" id="jf-cover">
          <h2>Ảnh bìa và ảnh trong bài</h2>
          <PhotoPanel photos={photos} busy={!!busy} onUpload={uploadFiles} onAction={photoAction} onInsert={photo => insert(`\n\n![${photo.alt}](/media/catalog/${photo.id})\n\n`)} />
          <label>Mô tả ảnh bìa <Counter value={countTextWords(f.coverAlt)} min={BLOG.alt.minWords} max={BLOG.alt.maxWords} /><input {...field('coverAlt')} maxLength={BLOG.store.coverAlt} /><small>Mô tả bằng tiếng Anh: chụp gì, ở đâu (8–15 từ).</small></label>
        </section>
        <details className="je-card">
          <summary>Bản tiếng Việt (không bắt buộc)</summary>
          <label>Tiêu đề tiếng Việt<input {...field('titleVi')} maxLength={BLOG.store.h1} /></label>
          <label>Mô tả tiếng Việt<textarea {...field('metaVi')} rows={2} maxLength={BLOG.store.meta} /></label>
          <label>Nội dung tiếng Việt (Markdown)<textarea {...field('bodyVi')} rows={12} maxLength={BLOG.store.body} /></label>
        </details>
      </div>

      <aside className="je-side">
        <div className="je-tabs" role="tablist">{tabs.map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>{label}{key === 'checks' && <b className={counts.block ? 'is-bad' : 'is-good'}>{counts.block ? counts.block : '✓'}</b>}</button>)}</div>
        {tab === 'checks' && <div className="je-panel">
          <p className="je-totals"><strong className="is-bad">{counts.block} chặn</strong> · <strong className="is-warn">{counts.warn} cảnh báo</strong> · <strong className="is-good">{counts.ok} đạt</strong></p>
          {(['block', 'warn'] as const).map(level => group(level).length > 0 && <ul key={level} className={`je-checks is-${level}`}>{group(level).map((check, index) => <li key={`${check.code}-${index}`}>
            <button type="button" onClick={() => jump(check)}><code>{check.code}</code><span>{check.message}</span></button></li>)}</ul>)}
          {group('ok').length > 0 && <details><summary>{group('ok').length} quy tắc đạt</summary><ul className="je-checks is-ok">{group('ok').map((check, index) => <li key={`${check.code}-${index}`}><code>{check.code}</code><span>{check.message}</span></li>)}</ul></details>}
          {!checks.length && <p className="je-muted">Đang kiểm tra…</p>}
        </div>}
        {tab === 'google' && <div className="je-panel">
          <div className="je-serp"><p className="je-serp-url">drmstays.vn › en › journal › {f.slug || '…'}</p><p className="je-serp-title">{cut(seoShown, 60) || 'Tiêu đề Google'}</p><p className="je-serp-desc">{cut(f.meta, BLOG.meta.max) || 'Mô tả Google'}</p></div>
          <p className="je-muted">Google thường chỉ hiện khoảng 60 ký tự của tiêu đề và 160 ký tự của mô tả; phần dư bị cắt bằng “…”.</p>
        </div>}
        {/* Kept mounted (hidden) so the preview frame loads once and keeps its connection to the editor. */}
        <div className="je-panel" hidden={tab !== 'page'}>
          <div className="je-row"><span className="je-muted">Dùng đúng giao diện của website.</span><button type="button" className="je-ghost" onClick={() => setPhone(value => !value)}>{phone ? 'Khung máy tính' : 'Khung điện thoại'}</button></div>
          <div ref={boxRef} className={`je-preview ${phone ? 'is-phone' : ''}`}>
            {(() => {
              const width = phone ? 390 : 1200, scale = phone ? 1 : Math.min(1, boxWidth / 1200), height = 680;
              return <iframe ref={frameRef} title="Xem trước trang bài" src="/admin/journal/preview" style={{ width, height: height / scale, transform: scale < 1 ? `scale(${scale})` : undefined }} />;
            })()}
          </div>
        </div>
        {tab === 'money' && <div className="je-panel">
          {amounts.length ? <table className="je-money"><thead><tr><th>Trong bài</th><th>Giá trị (VND)</th><th>Giá thật</th></tr></thead><tbody>{amounts.map((amount, index) => <tr key={index}><td>{amount.text}</td><td>{new Intl.NumberFormat('en-US').format(amount.value)}</td><td className={amount.known ? 'is-good' : 'is-warn'}>{amount.known ? 'Khớp' : 'Không khớp'}</td></tr>)}</tbody></table> : <p className="je-muted">Bài chưa nêu số tiền VND nào.</p>}
          <p className="je-muted">So với {props.knownPrices.length} mức giá thật (giá phòng, loại phòng, tiền cọc) lấy từ hệ thống.</p>
        </div>}

        <div className="je-card je-review">
          <h2>Người duyệt xác nhận</h2>
          <ul>{REVIEW_ITEMS.map((text, index) => <li key={text}><label className="je-check"><input type="checkbox" checked={reviews[index]} disabled={published} onChange={event => setReviews(current => current.map((value, i) => i === index ? event.target.checked : value))} /> {text}</label></li>)}</ul>
          {props.checkedAt && <p className="je-muted">Đăng lần gần nhất: {props.checkedAt.slice(0, 10)} (người duyệt: admin).</p>}
        </div>

        <div className="je-card je-actions">
          {status !== 'archived' && !published && <>
            <button type="button" disabled={!!busy} onClick={() => send('save')}>Lưu nháp</button>
            <button type="button" disabled={!!busy || !!readyReason} onClick={() => send('ready')} title={readyReason}>Đánh dấu sẵn sàng</button>
            {readyReason && <small className="je-why">{readyReason}</small>}
            <button type="button" className="je-primary" disabled={!!busy || !!publishReason} onClick={() => send('publish')} title={publishReason}>Đăng</button>
            {publishReason && <small className="je-why">{publishReason}</small>}
            <button type="button" className="je-ghost" disabled={!!busy || !saved} onClick={() => send('archive')}>Lưu trữ</button>
            <button type="button" className="je-danger" disabled={!!busy || !saved} onClick={() => { if (window.confirm('Xóa bài này? Bài sẽ biến khỏi danh sách.')) send('delete'); }}>Xóa</button>
          </>}
          {published && <>
            <button type="button" className="je-primary" disabled={!!busy || !!updateReason} onClick={() => send('update')} title={updateReason}>Cập nhật bài đã đăng</button>
            {updateReason && <small className="je-why">{updateReason}</small>}
            <button type="button" className="je-ghost" disabled={!!busy} onClick={() => { if (window.confirm('Gỡ bài xuống? Trang bài sẽ báo 404 và rời sitemap.')) send('unpublish'); }}>Gỡ xuống</button>
          </>}
          {status === 'archived' && <button type="button" disabled={!!busy} onClick={() => send('unarchive')}>Khôi phục về nháp</button>}
        </div>
      </aside>
    </div>
  </div>;
}

/** The big box that takes a whole post pasted from the Google Doc. */
function PasteBox({ onApply, onClose }: { onApply: (text: string) => string; onClose: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  return <div className="je-paste">
    <p className="je-muted">Dán cả bài, gồm khối thông tin ở đầu (giữa hai dòng <code>---</code>: h1, seo_title, meta, slug, keyword, variations, intent, template, level, topic, author, date, cover_alt) rồi đến nội dung Markdown.</p>
    <textarea rows={10} value={text} onChange={event => setText(event.target.value)} placeholder={'---\nh1: ...\nseo_title: ...\n---\nOpening answer…'} />
    <div className="je-row"><button type="button" disabled={!text.trim()} onClick={() => setResult(onApply(text))}>Phân tích và điền vào form</button><button type="button" className="je-ghost" onClick={onClose}>Đóng</button></div>
    {result && <p className="je-note">{result}</p>}
  </div>;
}

/** Cover and pictures of the post: upload (with the required description), insert into the text, set cover, delete. */
function PhotoPanel({ photos, busy, onUpload, onAction, onInsert }: {
  photos: EditorPhoto[]; busy: boolean; onUpload: (files: File[], alt: string) => Promise<boolean>;
  onAction: (action: 'cover' | 'delete' | 'alt', id: string, alt?: string) => Promise<void>; onInsert: (photo: EditorPhoto) => void;
}) {
  const [alt, setAlt] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  async function pick(list: FileList | File[] | null) {
    const files = Array.from(list || []).filter(file => file.type.startsWith('image/'));
    if (!files.length) return;
    if (await onUpload(files, alt)) { setAlt(''); if (input.current) input.current.value = ''; }
  }
  return <div className="je-photos">
    <div className={`je-drop ${over ? 'is-over' : ''}`} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={event => { event.preventDefault(); setOver(false); void pick(event.dataTransfer.files); }}>
      <label>Mô tả ảnh (bắt buộc, tiếng Anh, 8–15 từ) <Counter value={countTextWords(alt)} min={BLOG.alt.minWords} max={BLOG.alt.maxWords} /><input value={alt} maxLength={BLOG.store.coverAlt} onChange={event => setAlt(event.target.value)} placeholder="Quiet lane in An Thuong with apartment buildings at dusk" /></label>
      <p>Kéo ảnh vào đây hoặc <button type="button" className="je-ghost" disabled={busy} onClick={() => input.current?.click()}>chọn ảnh</button> (JPG, PNG, WebP, tối đa 8 MB; ảnh lớn tự thu nhỏ). Ảnh đầu tiên là ảnh bìa.</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event => void pick(event.target.files)} />
    </div>
    {photos.length > 0 && <ul className="je-photo-list">{photos.map((photo, index) => <li key={photo.id}>
      <img src={photo.url} alt={photo.alt} width={96} height={72} loading="lazy" />
      <div>
        <p>{index === 0 ? <strong className="je-badge">Ảnh bìa</strong> : null} <input aria-label="Mô tả ảnh" defaultValue={photo.alt} maxLength={BLOG.store.coverAlt} onBlur={event => { if (event.target.value.trim() !== photo.alt) void onAction('alt', photo.id, event.target.value); }} /></p>
        <p className="je-photo-buttons">
          <button type="button" disabled={busy} onClick={() => onInsert(photo)}>Chèn vào bài</button>
          {index > 0 && <button type="button" className="je-ghost" disabled={busy} onClick={() => void onAction('cover', photo.id)}>Đặt làm ảnh bìa</button>}
          <button type="button" className="je-danger" disabled={busy} onClick={() => { if (window.confirm('Xóa ảnh này?')) void onAction('delete', photo.id); }}>Xóa</button>
        </p>
      </div>
    </li>)}</ul>}
  </div>;
}
