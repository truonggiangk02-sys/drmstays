'use client';

import { useMemo, useState } from 'react';
import { Bold, Eraser, Image as ImageIcon, Italic, Link2, List, ListOrdered, ListPlus, Minus, Omega, Quote, Redo2, Search, StickyNote, Table2, Undo2 } from 'lucide-react';
import { BLOG } from '@/lib/blog-standard';
import { CTA_BLOCK, FAQ_BLOCK, HR_BLOCK, KEY_TAKEAWAYS_BLOCK, NOTE_BLOCK, asBlock, clearFormatting, insertText, lineStyleAt, linkTo, setLineStyle, toggleLinePrefix, validHref, wrapSelection, type TextEdit } from '@/lib/editor-text';
import { countTextWords } from '@/lib/journal-markdown';
import { searchChars } from '@/lib/special-chars';
import { addHeader, deleteColumn, deleteRow, deleteTable, insertColumn, insertRow, newTable, tableAt, tidyTable, type TableModel } from '@/lib/table-edit';
import { Popover } from '@/components/journal-popover';

export type LinkChoice = { path: string; label: string; group: string };
export type ToolbarPhoto = { id: string; url: string; alt: string };

type Props = {
  value: string;
  /** The cursor, as last seen (draws the style box and the table row), and the text selected right now. */
  selStart: number;
  selectedText: () => string;
  photos: ToolbarPhoto[];
  links: LinkChoice[];
  run: (build: (value: string, start: number, end: number) => TextEdit) => void;
  apply: (change: TextEdit) => void;
  put: (block: string) => void;
  addSection: (title: string, block: string) => void;
  undo: () => void; redo: () => void; find: () => void;
  goToPhotos: () => void;
};

/** One small button with an icon and, for the less obvious ones, a word. */
function Tool({ title, onClick, children, disabled, pressed, className = '' }: { title: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; pressed?: boolean; className?: string }) {
  return <button type="button" className={`je-tool ${className}`} title={title} aria-label={title} disabled={disabled} aria-pressed={pressed} onClick={onClick}>{children}</button>;
}

/** Table size picker: hover a grid (like Google Docs) or type the numbers. */
function TablePanel({ onPick, close }: { onPick: (cols: number, rows: number) => void; close: () => void }) {
  const [hover, setHover] = useState({ cols: 3, rows: 3 });
  const [cols, setCols] = useState(3), [rows, setRows] = useState(4);
  const choose = (c: number, r: number) => { onPick(c, r); close(); };
  return <div className="je-table-pick">
    <p className="je-muted">Chọn cỡ bảng (hàng đầu là hàng tiêu đề)</p>
    <div className="je-grid-pick" onMouseLeave={() => setHover({ cols: 0, rows: 0 })}>
      {Array.from({ length: 8 }, (_, r) => <div key={r} className="je-grid-row">{Array.from({ length: 8 }, (_, c) => {
        const on = r < hover.rows && c < hover.cols;
        return <button key={c} type="button" tabIndex={-1} className={on ? 'is-on' : ''} aria-label={`${c + 1} cột, ${r + 1} hàng`} onMouseEnter={() => setHover({ cols: c + 1, rows: r + 1 })} onClick={() => choose(c + 1, Math.max(1, r))} />;
      })}</div>)}
    </div>
    <p className="je-grid-size">{hover.cols ? `${hover.cols} cột × ${hover.rows} hàng` : 'Rê chuột để chọn'}</p>
    <div className="je-table-nums">
      <label>Cột <input type="number" min={1} max={8} value={cols} onChange={event => setCols(Math.min(8, Math.max(1, Number(event.target.value) || 1)))} /></label>
      <label>Hàng dữ liệu <input type="number" min={1} max={30} value={rows} onChange={event => setRows(Math.min(30, Math.max(1, Number(event.target.value) || 1)))} /></label>
      <button type="button" className="je-primary-sm" onClick={() => choose(cols, rows)}>Chèn bảng</button>
    </div>
  </div>;
}

/** Special characters: search box and groups; clicking a character puts it in the text (the panel stays open for more). */
function CharsPanel({ onPick }: { onPick: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const groups = useMemo(() => searchChars(query), [query]);
  const pick = (text: string) => { onPick(text); setRecent(list => [text, ...list.filter(item => item !== text)].slice(0, 10)); };
  return <div className="je-chars">
    <input type="search" placeholder="Tìm: đồng, mũi tên, euro, độ C…" value={query} onChange={event => setQuery(event.target.value)} aria-label="Tìm ký tự" autoFocus />
    {recent.length > 0 && !query && <div><p className="je-chars-title">Vừa dùng</p><div className="je-chars-row">{recent.map(text => <button key={text} type="button" onClick={() => pick(text)}>{text}</button>)}</div></div>}
    <div className="je-chars-scroll">
      {groups.map(group => <div key={group.name}><p className="je-chars-title">{group.name}</p><div className="je-chars-row">{group.items.map(item => <button key={`${group.name}-${item.text}`} type="button" title={item.label} aria-label={item.label} onClick={() => pick(item.text)}>{item.text}</button>)}</div></div>)}
      {!groups.length && <p className="je-muted">Không có ký tự nào khớp “{query}”. Thử gõ tên bằng tiếng Việt hoặc tiếng Anh.</p>}
    </div>
  </div>;
}

/** Link to a page of the website (searchable list) or to an https address. */
function LinkPanel({ links, selected, onInsert, close }: { links: LinkChoice[]; selected: string; onInsert: (href: string, label: string) => void; close: () => void }) {
  const [label, setLabel] = useState(selected);
  const [query, setQuery] = useState('');
  const [external, setExternal] = useState('');
  const [error, setError] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter(link => !q || `${link.label} ${link.path} ${link.group}`.toLowerCase().includes(q)).slice(0, 60);
  }, [links, query]);
  const groups = [...new Set(shown.map(link => link.group))];
  const insert = (href: string, fallback: string) => { onInsert(href, label.trim() || fallback); close(); };
  return <div className="je-link-pick">
    <label>Chữ hiển thị<input value={label} onChange={event => setLabel(event.target.value)} placeholder="Chữ người đọc thấy (để trống: lấy tên trang)" /></label>
    <label>Trang trong website<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tòa nhà, loại phòng, bài viết…" autoFocus /></label>
    <div className="je-link-list">
      {groups.map(group => <div key={group}><p className="je-chars-title">{group}</p>{shown.filter(link => link.group === group).map(link => <button key={link.path} type="button" onClick={() => insert(link.path, link.label)}><span>{link.label}</span><small>{link.path}</small></button>)}</div>)}
      {!shown.length && <p className="je-muted">Không có trang nào khớp.</p>}
    </div>
    <div className="je-link-ext">
      <label>Hoặc địa chỉ ngoài (https://…)<input value={external} onChange={event => { setExternal(event.target.value); setError(''); }} placeholder="https://www.example.gov/…" /></label>
      <button type="button" className="je-primary-sm" onClick={() => { const href = external.trim(); if (!validHref(href) || href.startsWith('/')) { setError('Link ngoài phải bắt đầu bằng https:// và không có dấu cách.'); return; } insert(href, href); }}>Chèn</button>
    </div>
    {error && <p className="je-link-error" role="alert">{error}</p>}
  </div>;
}

/** The photos of the post: click one to put it in the text. */
function ImagePanel({ photos, onPick, goToPhotos, close }: { photos: ToolbarPhoto[]; onPick: (photo: ToolbarPhoto) => void; goToPhotos: () => void; close: () => void }) {
  if (!photos.length) return <div className="je-image-pick"><p className="je-muted">Bài chưa có ảnh nào. Tải ảnh lên ở mục “Ảnh bìa và ảnh theo từng mục” bên dưới, rồi quay lại đây để chèn.</p><button type="button" className="je-primary-sm" onClick={() => { goToPhotos(); close(); }}>Đi tới mục tải ảnh</button></div>;
  return <div className="je-image-pick">
    <p className="je-muted">Bấm một ảnh để chèn vào chỗ con trỏ.</p>
    <div className="je-image-grid">{photos.map((photo, index) => {
      const words = countTextWords(photo.alt);
      const short = words < BLOG.alt.minWords || words > BLOG.alt.maxWords;
      return <button key={photo.id} type="button" title={photo.alt} onClick={() => { onPick(photo); close(); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" width={96} height={72} loading="lazy" />
        <span>{index === 0 ? 'Ảnh bìa' : `Ảnh ${index + 1}`}</span>
        {short && <small className="is-warn">mô tả {words} từ (cần {BLOG.alt.minWords}–{BLOG.alt.maxWords})</small>}
      </button>;
    })}</div>
    <button type="button" className="je-ghost" onClick={() => { goToPhotos(); close(); }}>Tải thêm ảnh ↓</button>
  </div>;
}

/**
 * The formatting and insert toolbar of the journal editor, modelled on word processors and page builders: a style box
 * (paragraph, heading 2, heading 3), bold and italic, lists, then Insert: link to a page of the site, picture, table (with a
 * size picker), special characters, rule, note, and the sections the standard asks for. Inside a table a third row offers
 * row and column commands.
 */
export function JournalToolbar(props: Props) {
  const { value, selStart, run, apply, put } = props;
  const style = lineStyleAt(value, selStart);
  const table = useMemo(() => tableAt(value, selStart), [value, selStart]);
  const edit = (build: (model: TableModel) => TextEdit | null) => { if (!table) return; const change = build(table); if (change) apply(change); };
  return <div className="je-toolbar" role="toolbar" aria-label="Định dạng và chèn">
    <div className="je-tools-row">
      <Tool title="Hoàn tác (Ctrl/⌘+Z)" onClick={props.undo}><Undo2 size={16} /></Tool>
      <Tool title="Làm lại (Ctrl/⌘+Shift+Z)" onClick={props.redo}><Redo2 size={16} /></Tool>
      <span className="je-sep" aria-hidden="true" />
      <select className="je-style" aria-label="Kiểu đoạn" title="Kiểu đoạn" value={style} onChange={event => { const next = event.target.value as 'p' | 'h2' | 'h3'; run((text, start) => setLineStyle(text, start, next)); }}>
        <option value="p">Đoạn văn</option><option value="h2">Tiêu đề mục (H2)</option><option value="h3">Tiêu đề nhỏ (H3)</option>
        {style === 'other' && <option value="other" disabled>(danh sách, trích dẫn, bảng…)</option>}
      </select>
      <Tool title="Đậm (Ctrl/⌘+B)" onClick={() => run((text, start, end) => wrapSelection(text, start, end, '**', 'bold text'))}><Bold size={16} /></Tool>
      <Tool title="Nghiêng (Ctrl/⌘+I)" onClick={() => run((text, start, end) => wrapSelection(text, start, end, '*', 'italic text'))}><Italic size={16} /></Tool>
      <Tool title="Danh sách gạch đầu dòng" onClick={() => run((text, start, end) => toggleLinePrefix(text, start, end, 'bullet'))}><List size={16} /></Tool>
      <Tool title="Danh sách đánh số" onClick={() => run((text, start, end) => toggleLinePrefix(text, start, end, 'number'))}><ListOrdered size={16} /></Tool>
      <Tool title="Trích dẫn" onClick={() => run((text, start, end) => toggleLinePrefix(text, start, end, 'quote'))}><Quote size={16} /></Tool>
      <Tool title="Xóa định dạng (đậm, nghiêng, tiêu đề, danh sách…)" onClick={() => run(clearFormatting)}><Eraser size={16} /></Tool>
      <span className="je-sep" aria-hidden="true" />
      <Tool title="Tìm và thay thế (Ctrl/⌘+H)" onClick={props.find}><Search size={16} /></Tool>
    </div>
    <div className="je-tools-row">
      <span className="je-tools-label">Chèn</span>
      <Popover label="Chèn link" title="Chèn link tới trang trong website hoặc địa chỉ ngoài (Ctrl/⌘+K)" trigger={<><Link2 size={16} /><span>Link</span></>}>
        {close => <LinkPanel links={props.links} selected={props.selectedText()} onInsert={(href, label) => run((text, start, end) => linkTo(text, start, end, href, label))} close={close} />}
      </Popover>
      <Popover label="Chèn ảnh" title="Chèn ảnh của bài" trigger={<><ImageIcon size={16} /><span>Ảnh</span></>}>
        {close => <ImagePanel photos={props.photos} onPick={photo => put(`![${photo.alt}](/media/catalog/${photo.id})`)} goToPhotos={props.goToPhotos} close={close} />}
      </Popover>
      <Popover label="Chèn bảng" title="Chèn bảng" trigger={<><Table2 size={16} /><span>Bảng</span></>}>
        {close => <TablePanel close={close} onPick={(cols, rows) => { const made = newTable(cols, rows); run((text, start, end) => asBlock(text, start, end, made.text, made.select)); }} />}
      </Popover>
      <Popover label="Ký tự đặc biệt" title="Ký tự đặc biệt (₫, m², °C, —, →…)" trigger={<><Omega size={16} /><span>Ký tự</span></>}>
        {() => <CharsPanel onPick={text => run((_, start, end) => insertText(start, end, text))} />}
      </Popover>
      <Tool title="Đường kẻ ngang" onClick={() => put(HR_BLOCK)}><Minus size={16} /></Tool>
      <Tool title="Ghi chú (khung trích dẫn có chữ Note)" onClick={() => put(NOTE_BLOCK)}><StickyNote size={16} /></Tool>
      <Popover label="Mục có sẵn" title="Chèn mục có sẵn mà tiêu chuẩn yêu cầu" trigger={<><ListPlus size={16} /><span>Mục có sẵn</span></>}>
        {close => <div className="je-sections">
          <p className="je-muted">Chèn khung mục theo tiêu chuẩn; chỗ trống ghi [NEEDS INPUT] cho tới khi điền.</p>
          <button type="button" onClick={() => { props.addSection(BLOG.keyTakeawaysHeading, KEY_TAKEAWAYS_BLOCK); close(); }}><strong>Ý chính (Key takeaways)</strong><small>3–5 gạch đầu dòng ngay sau mở bài</small></button>
          <button type="button" onClick={() => { props.addSection(BLOG.faqHeading, FAQ_BLOCK); close(); }}><strong>Hỏi đáp (FAQ)</strong><small>3–5 câu hỏi, mỗi câu trả lời 30–70 từ</small></button>
          <button type="button" onClick={() => { put(CTA_BLOCK); close(); }}><strong>Lời mời liên hệ</strong><small>Link tới /en/stays và /en/contact, đặt ở cuối bài</small></button>
        </div>}
      </Popover>
    </div>
    {table && <div className="je-tools-row je-table-row" aria-label="Công cụ bảng">
      <span className="je-tools-label">Bảng</span>
      {table.hasHeader ? <>
        <Tool title="Thêm hàng phía trên hàng này" disabled={insertRow(table, 'above') === null} onClick={() => edit(model => insertRow(model, 'above'))}><span>+ Hàng ↑</span></Tool>
        <Tool title="Thêm hàng phía dưới hàng này" onClick={() => edit(model => insertRow(model, 'below'))}><span>+ Hàng ↓</span></Tool>
        <Tool title="Thêm cột bên trái cột này" onClick={() => edit(model => insertColumn(model, 'left'))}><span>+ Cột ←</span></Tool>
        <Tool title="Thêm cột bên phải cột này" onClick={() => edit(model => insertColumn(model, 'right'))}><span>+ Cột →</span></Tool>
        <Tool title="Xóa hàng này" disabled={deleteRow(table) === null} onClick={() => edit(model => deleteRow(model))}><span>− Hàng</span></Tool>
        <Tool title="Xóa cột này" disabled={deleteColumn(table) === null} onClick={() => edit(model => deleteColumn(model))}><span>− Cột</span></Tool>
        <Tool title="Căn thẳng các cột cho dễ đọc. Phím Tab chuyển sang ô kế tiếp; Tab ở ô cuối thêm hàng mới." disabled={tidyTable(table) === null} onClick={() => edit(model => tidyTable(model))}><span>Căn thẳng</span></Tool>
      </> : <Tool title="Biến hàng đầu thành hàng tiêu đề" onClick={() => edit(model => addHeader(model))}><span>Thêm hàng tiêu đề</span></Tool>}
      <Tool title="Xóa cả bảng" className="je-tool-danger" onClick={() => apply(deleteTable(value, table))}><span>Xóa bảng</span></Tool>
    </div>}
  </div>;
}
