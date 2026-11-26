'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { findMatches, nextMatch } from '@/lib/find-replace';

type Props = {
  value: string;
  /** The cursor and selection right now (read from the writing box each time it is needed). */
  getSelection: () => { start: number; end: number };
  /** Selects a stretch of the text and shows it. */
  goTo: (from: number, length: number) => void;
  /** Replaces a stretch (one undoable step). */
  replaceRange: (from: number, to: number, text: string) => void;
  /** Replaces the whole text (one undoable step); the editor says how many were replaced. */
  replaceAll: (query: string, replacement: string, matchCase: boolean) => void;
  close: () => void;
};

/** Find and replace bar (Ctrl/⌘+H): search, next, replace this one, replace all. */
export function JournalFind({ value, getSelection, goTo, replaceRange, replaceAll, close }: Props) {
  const [query, setQuery] = useState(() => { const { start, end } = getSelection(); const text = value.slice(start, end); return text && !text.includes('\n') && text.length <= 60 ? text : ''; });
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  const total = useMemo(() => findMatches(value, query, matchCase).length, [value, query, matchCase]);

  const next = () => {
    const { start, end } = getSelection();
    const at = nextMatch(value, query, end > start ? end : start, matchCase);
    if (at !== null) goTo(at, query.length);
  };
  const isMatchSelected = () => { const { start, end } = getSelection(); const text = value.slice(start, end); return !!query && text.length === query.length && (matchCase ? text === query : text.toLowerCase() === query.toLowerCase()); };
  const replaceOne = () => {
    const { start, end } = getSelection();
    if (isMatchSelected()) { replaceRange(start, end, replacement); return; }
    next();
  };

  return <div className="je-find" role="search" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <label>Tìm<input ref={input} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); next(); } }} /></label>
    <label>Thay bằng<input value={replacement} onChange={event => setReplacement(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); replaceOne(); } }} /></label>
    <label className="je-check"><input type="checkbox" checked={matchCase} onChange={event => setMatchCase(event.target.checked)} /> Phân biệt hoa thường</label>
    <span className="je-find-count" aria-live="polite">{query ? `${total} kết quả` : ''}</span>
    <button type="button" onClick={next} disabled={!total}>Tiếp ↓</button>
    <button type="button" onClick={replaceOne} disabled={!total}>Thay</button>
    <button type="button" onClick={() => replaceAll(query, replacement, matchCase)} disabled={!total}>Thay hết</button>
    <button type="button" className="je-ghost" onClick={close} aria-label="Đóng tìm và thay">Đóng (Esc)</button>
  </div>;
}
