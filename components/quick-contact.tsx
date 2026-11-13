'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';

type Channel = { name: string; url?: string; mark: string };

/**
 * Floating contact button. The "Liên hệ" button is always there: on its own it opens the contact page, and once chat channels
 * are set up it opens a small panel listing them (plus the contact form), so adding channels never makes the button disappear.
 */
export function QuickContact({ lang, channels, preview = false }: { lang: 'vi' | 'en'; channels: Channel[]; preview?: boolean }) {
  const vi = lang === 'vi';
  const [open, setOpen] = useState(false);
  const dock = useRef<HTMLDivElement>(null);
  const shown = channels.filter(channel => preview || !!channel.url);
  const label = vi ? 'Liên hệ' : 'Contact';

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!dock.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!shown.length) return <a className="qc-main qc-dock qc-alone" href={`/${lang}/contact`}><MessageCircle size={20} aria-hidden="true" />{label}</a>;

  return <div className="qc-dock" ref={dock}>
    {open && <div className="qc-panel" id="qc-panel" role="group" aria-label={vi ? 'Liên hệ nhanh' : 'Quick contact'}>
      {shown.map(channel => channel.url
        ? <a key={channel.name} className={`qc-item is-${channel.name.toLowerCase()}`} href={channel.url} target="_blank" rel="noopener noreferrer" aria-label={`${vi ? 'Liên hệ qua' : 'Contact via'} ${channel.name} · ${vi ? 'mở trong tab mới' : 'opens in a new tab'}`}><span className="qc-mark" aria-hidden="true">{channel.mark}</span>{channel.name}</a>
        : <span key={channel.name} className="qc-item is-off" aria-label={`${channel.name}: ${vi ? 'chưa cài link' : 'link not configured'}`}><span className="qc-mark" aria-hidden="true">{channel.mark}</span>{channel.name}<small>{vi ? 'chưa cài link' : 'not set up'}</small></span>)}
      <a className="qc-item qc-form" href={`/${lang}/contact`}><span className="qc-mark" aria-hidden="true">✉</span>{vi ? 'Gửi yêu cầu tư vấn' : 'Send an inquiry'}</a>
    </div>}
    <button type="button" className="qc-main" aria-expanded={open} aria-controls="qc-panel" onClick={() => setOpen(value => !value)}><MessageCircle size={20} aria-hidden="true" />{label}</button>
  </div>;
}
