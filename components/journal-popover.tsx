'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A button that opens a small panel under it (the "Insert > Table" boxes of a word processor). Closes on Esc, on a click
 * outside, and when the panel asks to. The panel gets a `close` function.
 */
export function Popover({ label, trigger, title, children, className = '' }: { label: string; trigger: ReactNode; title?: string; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      box.current?.querySelector<HTMLButtonElement>('.je-pop-trigger')?.focus();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  return <div className={`je-pop ${className}`} ref={box}>
    <button type="button" className="je-pop-trigger" aria-haspopup="dialog" aria-expanded={open} title={title || label} onClick={() => setOpen(value => !value)}>{trigger}</button>
    {open && <div className="je-pop-panel" role="dialog" aria-label={label}>{children(() => setOpen(false))}</div>}
  </div>;
}
