'use client';

import { useEffect, useRef, useState } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';

type Channel = { name: string; url?: string; mark: string };

const svg = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

function ChannelIcon({ name }: { name: string }) {
  switch (name.toLowerCase()) {
    case 'facebook': return <svg {...svg} fill="currentColor" stroke="none"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z" /></svg>;
    case 'instagram': return <svg {...svg}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
    case 'telegram': return <Send size={21} aria-hidden="true" />;
    case 'whatsapp': return <MessageCircle size={22} aria-hidden="true" />;
    case 'zalo': return <span className="qc-zalo" aria-hidden="true">Zalo</span>;
    default: return <span aria-hidden="true">{name[0]}</span>;
  }
}

/**
 * Floating contact button. The "Liên hệ" button is always there: on its own it opens the contact page; once chat channels are
 * set up it opens a column of round icons above it (only channels that really have a link, plus the contact form).
 */
export function QuickContact({ lang, channels }: { lang: 'vi' | 'en'; channels: Channel[]; preview?: boolean }) {
  const vi = lang === 'vi';
  const [open, setOpen] = useState(false);
  const dock = useRef<HTMLDivElement>(null);
  const shown = channels.filter((channel): channel is Channel & { url: string } => !!channel.url);
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
    {open && <div className="qc-stack" id="qc-panel" role="group" aria-label={vi ? 'Liên hệ nhanh' : 'Quick contact'}>
      {shown.map((channel, index) => <a key={channel.name} className={`qc-round is-${channel.name.toLowerCase()}`} style={{ '--i': index } as React.CSSProperties} href={channel.url} target="_blank" rel="noopener noreferrer" title={channel.name} aria-label={`${vi ? 'Liên hệ qua' : 'Contact via'} ${channel.name} · ${vi ? 'mở trong tab mới' : 'opens in a new tab'}`}><ChannelIcon name={channel.name} /></a>)}
      <a className="qc-round is-form" style={{ '--i': shown.length } as React.CSSProperties} href={`/${lang}/contact`} title={vi ? 'Gửi yêu cầu tư vấn' : 'Send an inquiry'} aria-label={vi ? 'Gửi yêu cầu tư vấn' : 'Send an inquiry'}><Mail size={21} aria-hidden="true" /></a>
    </div>}
    <button type="button" className="qc-main" aria-expanded={open} aria-controls="qc-panel" onClick={() => setOpen(value => !value)}><MessageCircle size={20} aria-hidden="true" />{label}</button>
  </div>;
}
