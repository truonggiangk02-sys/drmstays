'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BLOG, INTENTS, LEVELS, REVIEW_ITEMS, STATUSES, TEMPLATES, TOPICS, type Status } from '@/lib/blog-standard';
import { blockers, chars, checkPost, findVndAmounts, summary, type BlogContext, type BlogDraft, type Check } from '@/lib/blog-check';
import { parsePastedPost, type PostFields } from '@/lib/blog-frontmatter';
import { bodyWords, countTextWords, markdownLinks, mediaImageId, outline, readingMinutes, slugify } from '@/lib/journal-markdown';
import { asBlock, makeLink, outlineWithWords, wrapSelection, type TextEdit } from '@/lib/editor-text';
import { cellRanges, insertRow, tableAt } from '@/lib/table-edit';
import { replaceAllText } from '@/lib/find-replace';
import { JournalToolbar, type LinkChoice } from '@/components/journal-toolbar';
import { JournalFind } from '@/components/journal-find';
import { JournalSections } from '@/components/journal-sections';
import { addPictures, numberHeadings, planSections, removePicture } from '@/lib/journal-sections';
import { caretTop } from '@/lib/textarea-caret';
import { problemMarks, segments } from '@/lib/problem-marks';
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
  authors: Array<Pick<Author, 'id' | 'name' | 'role' | 'bio' | 'photo_id' | 'url' | 'kind'>>; links: LinkChoice[]; others: BlogContext['others']; knownPrices: number[]; knownPaths: string[]; photos: EditorPhoto[];
};

const tabs = [['checks', 'Kiểm tra'], ['outline', 'Dàn ý'], ['google', 'Google'], ['page', 'Xem trước trang'], ['money', 'Số tiền VND']] as const;
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
  const [backup, setBackup] = useState<{ at: number; fields: EditorFields } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showMarks, setShowMarks] = useState(true);
  const [caret, setCaret] = useState(0);
  const [selEnd, setSelEnd] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [checkedBody, setCheckedBody] = useState(props.initial.body);
  const [fieldWidth, setFieldWidth] = useState(0);
  const backdropRef = useRef<HTMLDivElement>(null);

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
    const body = f.body;
    const timer = setTimeout(() => { setChecks(checkPost({ ...draft }, ctx)); setCheckedBody(body); }, 500);
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

  // A copy of what is being typed is kept in this browser, so a closed tab or a crash does not lose the article.
  const backupKey = `journal-backup-${props.id}`;
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const data = JSON.parse(localStorage.getItem(backupKey) || 'null') as { at: number; fields: EditorFields } | null;
        if (data?.fields && JSON.stringify(data.fields) !== JSON.stringify(props.initial)) setBackup(data);
      } catch { /* no backup, or storage is off */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [backupKey, props.initial]);
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => { try { localStorage.setItem(backupKey, JSON.stringify({ at: Date.now(), fields: f })); } catch { /* storage full or off */ } }, 1200);
    return () => clearTimeout(timer);
  }, [dirty, f, backupKey]);

  // Ctrl/Cmd+S saves the draft (anywhere on the page). Runs on every render so it always sees the latest text.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (busy) return;
      if (published) setMessage({ kind: 'error', text: 'Bài đang đăng: bấm "Cập nhật bài đã đăng" để lưu thay đổi.' });
      else if (status !== 'archived') void send('save');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Problems are coloured only while the checks are for the text on screen (a moment after typing, they are not).
  const marks = useMemo(() => (showMarks && checkedBody === f.body ? problemMarks(checks, f.body.length) : []), [showMarks, checkedBody, f.body, checks]);
  const pieces = useMemo(() => segments(f.body, marks), [f.body, marks]);
  const here = marks.find(mark => caret >= mark.from && caret <= mark.to);

  /** The colours sit behind the text and move with it. */
  function syncBackdrop() {
    const area = bodyRef.current, back = backdropRef.current;
    if (area && back) back.style.transform = `translateY(${-area.scrollTop}px)`;
  }
  useEffect(() => { syncBackdrop(); }, [f.body, marks, focusMode, fieldWidth]);
  useEffect(() => {
    const area = bodyRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setFieldWidth(area.clientWidth));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  // Writing full screen: Esc comes back, and the page behind does not scroll.
  useEffect(() => {
    if (!focusMode) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocusMode(false); };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => bodyRef.current?.focus({ preventScroll: true }));
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [focusMode]);

  const counts = summary(checks);
  const blocking = blockers(checks);
  const allTicked = reviews.every(Boolean);
  const words = bodyWords(f.body);
  const sections = useMemo(() => {
    const items = outlineWithWords(outline(f.body), f.body, countTextWords);
    const intro = countTextWords(f.body.slice(0, items[0]?.offset ?? f.body.length));
    const plan = planSections(f.body).filter(section => section.key !== 'intro');
    let two = -1;
    const numbered = numberHeadings(items).map(item => { if (item.level === 2) two += 1; return { ...item, pictures: item.level === 2 ? plan[two]?.pictures.length ?? 0 : 0 }; });
    return { items: numbered, intro, h2: items.filter(item => item.level === 2).length, pictures: planSections(f.body)[0]?.pictures.length ?? 0 };
  }, [f.body]);
  const target = f.level === 'A' || f.level === 'B' ? BLOG.words[f.level] : null;
  const wordTone = words < BLOG.words.hardMin || words > BLOG.words.hardMax ? 'is-bad' : target && (words < target.min || words > target.max) ? 'is-warn' : 'is-ok';
  const number = (value: number) => new Intl.NumberFormat('en-US').format(value);

  async function send(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action); setMessage(null);
    try {
      const response = await fetch('/api/admin/journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: props.id, action, ...f, reviews, confirmSlugChange: confirmSlug, ...extra }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; status?: Status | 'deleted'; slug?: string; checks?: Check[]; notice?: string };
      if (!response.ok) { setMessage({ kind: 'error', text: data.error || 'Không thực hiện được.' }); if (data.checks) { setChecks(data.checks); setCheckedBody(f.body); } return false; }
      if (data.status === 'deleted') { window.location.assign('/admin/journal?saved=deleted'); return true; }
      if (data.status) setStatus(data.status);
      if (data.slug) { setServerSlug(data.slug); setF(current => ({ ...current, slug: data.slug! })); }
      if (['ready', 'publish', 'update'].includes(action) || data.status === 'published') setEverLive(value => value || data.status === 'published');
      if (action === 'publish' || action === 'update') setEverLive(true);
      setSaved(true); setDirty(false); setUnlockSlug(false); setConfirmSlug(false);
      try { localStorage.removeItem(backupKey); } catch { /* storage off */ }
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

  /** Applies one text change as a single undoable step (Ctrl/Cmd+Z works); where the browser cannot, the text is simply replaced. */
  function applyChange(change: TextEdit) {
    const area = bodyRef.current;
    if (!area) return;
    area.focus({ preventScroll: true });
    area.setSelectionRange(change.from, change.to);
    const done = typeof document.execCommand === 'function' && document.execCommand('insertText', false, change.text);
    if (!done) edit({ body: area.value.slice(0, change.from) + change.text + area.value.slice(change.to) });
    requestAnimationFrame(() => { area.setSelectionRange(change.selectFrom, change.selectTo); syncSelection(); });
  }
  /** Copies the box's real cursor into the editor's state (the toolbar draws itself from it). */
  function syncSelection() { const area = bodyRef.current; if (area) { setCaret(area.selectionStart); setSelEnd(area.selectionEnd); } }
  const liveSelection = () => ({ start: bodyRef.current?.selectionStart ?? 0, end: bodyRef.current?.selectionEnd ?? 0 });
  const selectedText = () => { const { start, end } = liveSelection(); const text = f.body.slice(start, end); return text && !text.includes('\n') ? text : ''; };
  const selection = () => ({ start: bodyRef.current?.selectionStart ?? f.body.length, end: bodyRef.current?.selectionEnd ?? f.body.length });
  const run = (build: (value: string, start: number, end: number) => TextEdit) => { const { start, end } = selection(); applyChange(build(f.body, start, end)); };
  const putBlock = (block: string) => run((value, start, end) => asBlock(value, start, end, block));

  /** Brings the spot to about a third of the way down the box (the box scrolls, not the page) and puts the cursor there. */
  function scrollToOffset(offset: number, length = 0) {
    const area = bodyRef.current;
    if (!area) return;
    area.focus({ preventScroll: true });
    area.setSelectionRange(offset, offset + length);
    setCaret(offset);
    setSelEnd(offset + length);
    area.scrollTo({ top: Math.max(0, caretTop(area, offset) - area.clientHeight / 3), behavior: 'smooth' });
    const rect = focusMode ? null : area.closest('.je-write')?.getBoundingClientRect();
    if (rect && (rect.top < 0 || rect.top > window.innerHeight * 0.5)) area.closest('.je-write')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Key takeaways / FAQ: inserted where the cursor is, or, when the post already has the section, the cursor goes there. */
  function addSection(title: string, block: string) {
    const found = outline(f.body).find(item => item.level === 2 && item.text.toLowerCase() === title.toLowerCase());
    if (found) { scrollToOffset(found.offset); setMessage({ kind: 'ok', text: `Bài đã có mục "${title}".` }); return; }
    putBlock(block);
  }

  const undo = () => { bodyRef.current?.focus({ preventScroll: true }); document.execCommand('undo'); };
  const redo = () => { bodyRef.current?.focus({ preventScroll: true }); document.execCommand('redo'); };
  const goToPhotos = () => document.getElementById('jf-cover')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  /** Selects a stretch of the text and shows it (used by find). */
  const goTo = (from: number, length: number) => { scrollToOffset(from, length); };
  const replaceRange = (from: number, to: number, text: string) => { applyChange({ from, to, text, selectFrom: from + text.length, selectTo: from + text.length }); };
  function replaceEverywhere(query: string, replacement: string, matchCase: boolean) {
    const result = replaceAllText(f.body, query, replacement, matchCase);
    if (!result.count) return;
    applyChange({ from: 0, to: f.body.length, text: result.text, selectFrom: 0, selectTo: 0 });
    setMessage({ kind: 'ok', text: `Đã thay ${result.count} chỗ. Bấm Ctrl/⌘+Z để hoàn tác.` });
  }
  /** Puts the cursor on a stretch and keeps the editor's idea of the selection in step. */
  const select = (from: number, to: number) => { const area = bodyRef.current; if (!area) return; area.focus({ preventScroll: true }); area.setSelectionRange(from, to); setCaret(from); setSelEnd(to); };

  /** Goes to the next problem in the text after the cursor (a blocking one or a warning), and selects it; from the last one it starts over. */
  function nextProblem() {
    const area = bodyRef.current;
    if (!area) return;
    const list = checks.filter(check => check.field === 'body' && check.offset !== undefined && (check.level === 'block' || check.level === 'warn')).sort((a, b) => a.offset! - b.offset!);
    if (!list.length) { setMessage({ kind: 'ok', text: 'Không còn lỗi hay cảnh báo nào chỉ vào một chỗ cụ thể trong bài.' }); return; }
    const next = list.find(check => check.offset! > area.selectionStart) || list[0];
    scrollToOffset(next.offset!, next.length || 0);
  }

  function onBodyKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // In a table, Tab moves to the next cell (Shift+Tab to the one before); Tab in the last cell adds a row, like a word processor.
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const area = event.currentTarget;
      const model = tableAt(f.body, area.selectionStart);
      if (!model || !model.hasHeader) return;
      event.preventDefault();
      const cells = cellRanges(f.body, model);
      const here = cells.findIndex(cell => area.selectionStart >= cell.from && area.selectionStart <= cell.to + 1);
      const index = here === -1 ? cells.findIndex(cell => cell.from > area.selectionStart) : here;
      const target = cells[event.shiftKey ? index - 1 : index + 1];
      if (target) select(target.from, target.to);
      else if (!event.shiftKey && index === cells.length - 1) {
        const change = insertRow({ ...model, rowIndex: model.rows.length - 1, colIndex: 0 }, 'below');
        if (change) applyChange(change);
      }
      return;
    }
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (event.shiftKey) return;
    if (key === 'b') { event.preventDefault(); run((value, start, end) => wrapSelection(value, start, end, '**', 'bold text')); }
    else if (key === 'i') { event.preventDefault(); run((value, start, end) => wrapSelection(value, start, end, '*', 'italic text')); }
    else if (key === 'k') { event.preventDefault(); run(makeLink); }
    else if (key === 'h') { event.preventDefault(); setFindOpen(true); }
  }

  function jump(check: Check) {
    if (check.field === 'body' && check.offset !== undefined) { scrollToOffset(check.offset, check.length || 0); return; }
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

  /** Edits the text from a place that may run after an upload: always works on the latest text. */
  function changeBody(change: (body: string) => string) {
    setF(current => ({ ...current, body: change(current.body) }));
    setDirty(true);
    setReviews(REVIEW_ITEMS.map(() => false));
  }
  const pictureLine = (id: string, alt: string) => `![${alt.replace(/[[\]\n]+/g, ' ').replace(/\s+/g, ' ').trim()}](/media/catalog/${id})`;

  /** Uploads pictures for the cover or for one section; the ones for a section are put in the text right under its heading. */
  async function uploadPictures(files: File[], description: string, key: string) {
    if (!description.trim()) { setMessage({ kind: 'error', text: 'Nhập mô tả ảnh trước khi tải lên.' }); return false; }
    if (!(await ensureSaved())) return false;
    setBusy('upload');
    try {
      const form = new FormData();
      form.set('action', 'upload'); form.set('alt', description);
      for (const file of files) form.append('image', await shrink(file));
      const hadCover = photos.length > 0;
      const data = await callPhotos(form);
      const ids = (data.added || []).map(item => item.id);
      if (data.error || data.failed?.length) setMessage({ kind: 'error', text: data.error || (data.failed || []).join(' · ') });
      if (!ids.length) return false;
      if (key === 'cover') {
        if (hadCover) { const done = new FormData(); done.set('action', 'cover'); done.set('imageId', ids[0]); done.set('alt', ''); await callPhotos(done); }
        if (!data.error && !data.failed?.length) setMessage({ kind: 'ok', text: 'Đã cập nhật ảnh bìa.' });
      } else {
        changeBody(body => addPictures(body, key, ids.map(id => pictureLine(id, data.photos?.find(photo => photo.id === id)?.alt || description))));
        if (!data.error && !data.failed?.length) setMessage({ kind: 'ok', text: 'Đã tải ảnh lên và đặt ngay dưới tiêu đề mục. Bấm Lưu nháp để lưu.' });
      }
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
    {backup && !dirty && <p className="je-message is-warn" role="status">Có bản chưa lưu từ {new Date(backup.at).toLocaleString('vi-VN')} trên trình duyệt này.
      <button type="button" className="je-inline" onClick={() => { setF(backup.fields); setDirty(true); setBackup(null); }}>Khôi phục</button>
      <button type="button" className="je-inline" onClick={() => { try { localStorage.removeItem(backupKey); } catch { /* storage off */ } setBackup(null); }}>Bỏ</button></p>}
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
        <section className={`je-card je-write${focusMode ? ' je-focus' : ''}`}>
          <div className="je-row"><h2>Nội dung (tiếng Anh, Markdown)</h2><span className="je-row-actions"><button type="button" className="je-ghost" onClick={() => setHelpOpen(open => !open)} aria-expanded={helpOpen}>Cách viết</button>
            <button type="button" className="je-ghost" onClick={() => setFocusMode(on => !on)} aria-pressed={focusMode} title="Viết toàn màn hình (Esc để thoát)">{focusMode ? 'Thu nhỏ (Esc)' : 'Toàn màn hình'}</button></span></div>
          {helpOpen && <div className="je-help">
            <p><code>## Tiêu đề mục</code> · <code>### Tiêu đề nhỏ</code> · <code>**đậm**</code> · <code>*nghiêng*</code> · <code>- danh sách</code> · <code>1. đánh số</code> · <code>&gt; trích dẫn</code> · <code>[chữ](https://…)</code> · bảng: <code>| A | B |</code> rồi dòng <code>| --- | --- |</code>.</p>
            <p>Ảnh: mỗi mục có nút “Thêm ảnh vào mục này” ở phần ảnh bên dưới, hoặc dùng nút Ảnh trên thanh công cụ để chèn ảnh đã tải. H1 là ô “H1” ở đầu form (mỗi bài chỉ có một H1): trong nội dung chỉ dùng <code>##</code> và <code>###</code>, không dùng HTML.</p>
            <p>Phím tắt: <kbd>Ctrl/⌘</kbd>+<kbd>B</kbd> đậm, <kbd>I</kbd> nghiêng, <kbd>K</kbd> link, <kbd>H</kbd> tìm &amp; thay, <kbd>Z</kbd> hoàn tác, <kbd>S</kbd> lưu nháp. Trong bảng: <kbd>Tab</kbd> sang ô kế tiếp.</p>
          </div>}
          <JournalToolbar value={f.body} selStart={caret} selectedText={selectedText} photos={photos} links={props.links} run={run} apply={applyChange} put={putBlock} addSection={addSection} undo={undo} redo={redo} find={() => setFindOpen(open => !open)} goToPhotos={goToPhotos} />
          {findOpen && <JournalFind value={f.body} getSelection={liveSelection} goTo={goTo} replaceRange={replaceRange} replaceAll={replaceEverywhere} close={() => { setFindOpen(false); bodyRef.current?.focus({ preventScroll: true }); }} />}
          <div className="je-field">
            <div className="je-backdrop" aria-hidden="true" style={{ width: fieldWidth || undefined }}><div ref={backdropRef}>{pieces.map((piece, index) => piece.mark ? <mark key={index} className={`je-mark is-${piece.mark.level}`}>{piece.text}</mark> : <span key={index}>{piece.text}</span>)}{'\n'}</div></div>
            <textarea ref={bodyRef} id="jf-body" className="je-body" lang="en" aria-label="Nội dung bài viết (tiếng Anh, Markdown)" value={f.body} rows={26} maxLength={BLOG.store.body} onChange={event => edit({ body: event.target.value })} onKeyDown={onBodyKey} onScroll={syncBackdrop} onSelect={syncSelection} onKeyUp={syncSelection} onMouseUp={syncSelection} onFocus={syncSelection} spellCheck />
          </div>
          <div className="je-statusbar" aria-live="polite">
            <span className={wordTone}>{words} từ{target ? ` · mục tiêu ${number(target.min)}–${number(target.max)} (mức ${f.level})` : ''}</span>
            <span>{number(chars(f.body))} ký tự</span><span>đọc khoảng {readingMinutes(f.body)} phút</span><span>{sections.h2} mục ##</span>
            {selEnd > caret && <span>đã chọn {countTextWords(f.body.slice(caret, selEnd))} từ</span>}
            <span className="je-statusbar-tools">
              <label className="je-check"><input type="checkbox" checked={showMarks} onChange={event => setShowMarks(event.target.checked)} /> Tô lỗi</label>
              <button type="button" className="je-inline-btn" onClick={nextProblem} disabled={checkedBody !== f.body} title="Nhảy tới chỗ lỗi hoặc cảnh báo kế tiếp trong bài">Lỗi tiếp theo ↓</button>
            </span>
          </div>
          {here && <p className={`je-here is-${here.level}`} role="status"><code>{here.code}</code> {here.message}</p>}
          {focusMode && message && <p className={`je-message is-${message.kind} je-focus-note`} role="status">{message.text}</p>}
          {externalPictures.length > 0 && <div className="je-note"><p>{externalPictures.length} ảnh trong bài nằm ở website khác. Ảnh ngoài sẽ không hiện: hãy tải về website của mình.</p>
            <button type="button" disabled={!!busy} onClick={() => importPictures(externalPictures.map(link => ({ url: link.url, alt: link.text })))}>Tải ảnh ngoài về website</button></div>}
        </section>
        <section className="je-card" id="jf-cover">
          <h2>Ảnh bìa và ảnh theo từng mục</h2>
          <p className="je-muted">Mỗi mục ## có chỗ thêm ảnh riêng: ảnh được đặt ngay dưới tiêu đề mục đó. Mỗi ảnh cần mô tả tiếng Anh 5–18 từ.</p>
          <JournalSections body={f.body} photos={photos} busy={!!busy} onUpload={uploadPictures} onAction={photoAction}
            onPlace={(photo, key) => changeBody(body => addPictures(body, key, [pictureLine(photo.id, photo.alt)]))}
            onRemove={picture => changeBody(body => removePicture(body, picture))} />
          <label>Mô tả ảnh bìa <Counter value={countTextWords(f.coverAlt)} min={BLOG.alt.minWords} max={BLOG.alt.maxWords} /><input {...field('coverAlt')} maxLength={BLOG.store.coverAlt} /><small>Mô tả bằng tiếng Anh: chụp gì, ở đâu (5–18 từ).</small></label>
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
        {tab === 'outline' && <div className="je-panel">
          <p className="je-muted">Cấu trúc bài: H1 là tiêu đề trang, các mục ## nằm trong H1, các ### nằm trong mục ##. Bấm một dòng để nhảy tới đó. Số từ tính đến mục kế tiếp.</p>
          <ol className="je-outline">
            <li className="is-l1"><button type="button" onClick={() => document.getElementById('jf-h1')?.focus()}><span><b>H1</b> {f.h1 || '(chưa có tiêu đề)'}</span></button></li>
            <li className="is-l2"><button type="button" onClick={() => scrollToOffset(0)}><span>Mở bài (trả lời ngay trong 60 từ đầu)</span><small>{sections.intro} từ{sections.pictures ? ` · ${sections.pictures} ảnh` : ''}</small></button></li>
            {sections.items.map(item => <li key={item.offset} className={`is-l${item.level}`}><button type="button" onClick={() => scrollToOffset(item.offset)}><span><b>{item.number}</b> {item.text || '(trống)'}</span><small>{item.words} từ{item.pictures ? ` · ${item.pictures} ảnh` : ''}</small></button></li>)}
          </ol>
          <p className={`je-toc-note ${sections.h2 >= 3 ? 'is-ok' : 'is-warn'}`}>{sections.h2 >= 3 ? `Mục lục sẽ hiện trên trang bài: ${sections.h2} mục ##, kèm các ### bên dưới.` : `Mục lục chỉ hiện khi bài có từ 3 mục ## (hiện có ${sections.h2}).`}</p>
          {!sections.items.length && <p className="je-muted">Chưa có tiêu đề ## nào.</p>}
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
