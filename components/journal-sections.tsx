'use client';

import { useMemo, useRef, useState } from 'react';
import { BLOG } from '@/lib/blog-standard';
import { countTextWords } from '@/lib/journal-markdown';
import { planSections, usedPictureIds } from '@/lib/journal-sections';
import type { EditorPhoto } from '@/components/journal-editor';

/*
 * Pictures of a post, section by section: the cover, then the opening and every ## section each with its own pictures
 * and its own "add a picture" slot (the picture goes right under that heading). Pictures uploaded but not used yet are
 * listed at the end, to put in a section or make the cover.
 */

type Props = {
  body: string; photos: EditorPhoto[]; busy: boolean;
  onUpload: (files: File[], alt: string, key: string) => Promise<boolean>;
  onAction: (action: 'cover' | 'delete' | 'alt', id: string, alt?: string) => Promise<void>;
  onPlace: (photo: EditorPhoto, key: string) => void;
  onRemove: (picture: { offset: number; length: number }) => void;
};

function Slot({ label, busy, onUpload, onClose }: { label: string; busy: boolean; onUpload: (files: File[], alt: string) => Promise<boolean>; onClose?: () => void }) {
  const [alt, setAlt] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function pick(list: FileList | File[] | null) {
    const files = Array.from(list || []).filter(file => file.type.startsWith('image/'));
    if (!files.length) return;
    if (await onUpload(files, alt)) { setAlt(''); if (input.current) input.current.value = ''; onClose?.(); }
  }
  const words = countTextWords(alt);
  return <div className={`je-drop je-sec-slot${over ? ' is-over' : ''}`} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={event => { event.preventDefault(); setOver(false); void pick(event.dataTransfer.files); }}>
    <label>{label} <span className={`je-count ${words >= BLOG.alt.minWords && words <= BLOG.alt.maxWords ? 'is-ok' : 'is-bad'}`}>{words} / {BLOG.alt.minWords}–{BLOG.alt.maxWords}</span>
      <input value={alt} maxLength={BLOG.store.coverAlt} onChange={event => setAlt(event.target.value)} placeholder="Quiet lane in An Thuong with apartment buildings at dusk" /></label>
    <p>Mô tả bằng tiếng Anh: chụp gì, ở đâu. Kéo ảnh vào đây hoặc <button type="button" className="je-ghost" disabled={busy} onClick={() => input.current?.click()}>chọn ảnh</button> (JPG, PNG, WebP, tối đa 8 MB; ảnh lớn tự thu nhỏ).
      {onClose && <> <button type="button" className="je-ghost" onClick={onClose}>Đóng</button></>}</p>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event => void pick(event.target.files)} />
  </div>;
}

export function JournalSections({ body, photos, busy, onUpload, onAction, onPlace, onRemove }: Props) {
  const sections = useMemo(() => planSections(body), [body]);
  const used = useMemo(() => usedPictureIds(body), [body]);
  const [open, setOpen] = useState('');
  const library = new Map(photos.map(photo => [photo.id, photo]));
  const cover = photos[0];
  const spare = photos.slice(1).filter(photo => !used.has(photo.id));
  const [target, setTarget] = useState<Record<string, string>>({});

  return <div className="je-sec">
    <div className="je-sec-row">
      <h3>Ảnh bìa</h3>
      {cover ? <div className="je-sec-pic">
        <img src={cover.url} alt={cover.alt} width={96} height={72} loading="lazy" />
        <div><p className="je-muted">Hiện ở đầu trang bài, dưới tiêu đề.</p>
          <p className="je-photo-buttons">
            <button type="button" className="je-ghost" disabled={busy} onClick={() => setOpen(open === 'cover' ? '' : 'cover')}>Đổi ảnh bìa</button>
            <button type="button" className="je-danger" disabled={busy} onClick={() => { if (window.confirm('Xóa ảnh bìa?')) void onAction('delete', cover.id); }}>Xóa</button>
          </p></div>
      </div> : <Slot label="Mô tả ảnh bìa (bắt buộc)" busy={busy} onUpload={(files, alt) => onUpload(files, alt, 'cover')} />}
      {cover && open === 'cover' && <Slot label="Mô tả ảnh bìa mới (bắt buộc)" busy={busy} onUpload={(files, alt) => onUpload(files.slice(0, 1), alt, 'cover')} onClose={() => setOpen('')} />}
    </div>

    {sections.map(section => <div className="je-sec-row" key={section.key}>
      <h3>{section.key === 'intro' ? 'Mở bài' : <><span className="je-sec-tag">##</span> {section.title || '(trống)'}</>}</h3>
      {section.key === 'intro' && <p className="je-muted">Phần trước tiêu đề ## đầu tiên. Ảnh được đặt sau đoạn mở đầu để câu trả lời vẫn đứng đầu.</p>}
      {section.pictures.length > 0 && <ul className="je-sec-pics">{section.pictures.map(picture => {
        const known = library.get(picture.id);
        return <li key={picture.offset}>
          {known ? <img src={known.url} alt={known.alt} width={72} height={54} loading="lazy" /> : <span className="je-sec-ext" title={picture.url}>Ảnh ngoài</span>}
          <span className="je-sec-alt">{picture.alt || '(chưa có mô tả)'}</span>
          <button type="button" className="je-ghost" onClick={() => onRemove(picture)} title="Gỡ ảnh khỏi mục này (ảnh vẫn nằm trong danh sách “chưa dùng”)">Gỡ khỏi mục</button>
        </li>;
      })}</ul>}
      {open === section.key
        ? <Slot label="Mô tả ảnh (bắt buộc)" busy={busy} onUpload={(files, alt) => onUpload(files, alt, section.key)} onClose={() => setOpen('')} />
        : <p><button type="button" className="je-ghost" disabled={busy || !cover} title={cover ? '' : 'Hãy tải ảnh bìa trước'} onClick={() => setOpen(section.key)}>＋ Thêm ảnh vào mục này</button>
          {!cover && <small className="je-muted"> Tải ảnh bìa trước.</small>}</p>}
    </div>)}

    {spare.length > 0 && <div className="je-sec-row">
      <h3>Ảnh đã tải lên nhưng chưa dùng</h3>
      <ul className="je-sec-pics">{spare.map(photo => <li key={photo.id}>
        <img src={photo.url} alt={photo.alt} width={72} height={54} loading="lazy" />
        <span className="je-sec-alt">{photo.alt}</span>
        <select aria-label="Chọn mục để chèn" value={target[photo.id] ?? 'intro'} onChange={event => setTarget(current => ({ ...current, [photo.id]: event.target.value }))}>
          {sections.map(section => <option key={section.key} value={section.key}>{section.key === 'intro' ? 'Mở bài' : `## ${section.title}`}</option>)}
        </select>
        <button type="button" disabled={busy} onClick={() => onPlace(photo, target[photo.id] ?? 'intro')}>Chèn</button>
        <button type="button" className="je-ghost" disabled={busy} onClick={() => void onAction('cover', photo.id)}>Làm ảnh bìa</button>
        <button type="button" className="je-danger" disabled={busy} onClick={() => { if (window.confirm('Xóa ảnh này?')) void onAction('delete', photo.id); }}>Xóa</button>
      </li>)}</ul>
    </div>}
  </div>;
}
