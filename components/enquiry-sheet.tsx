'use client';

import { useEffect, useState } from 'react';

/**
 * Phone only: the fixed price bar opens the enquiry card as a bottom sheet that slides up over a dimmed page.
 * On wide screens the card is a normal sticky column and this does nothing visible. The card must have id "dv-contact"
 * and contain a [data-sheet-close] button.
 */
export function EnquirySheet({ summary, open: openLabel }: { summary: string; open: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const card = document.getElementById('dv-contact');
    card?.classList.toggle('is-open', open);
    document.body.classList.toggle('dv-sheet-open', open);
    if (open) card?.focus({ preventScroll: true });
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : (event.target as Element | null)?.closest('[data-sheet-close]')) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('click', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('click', close); document.body.classList.remove('dv-sheet-open'); };
  }, [open]);

  return <>
    <div className="dv-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
    <div className="dv-bar"><strong>{summary}</strong><button type="button" className="dv-button" aria-expanded={open} aria-controls="dv-contact" onClick={() => setOpen(true)}>{openLabel}</button></div>
  </>;
}
