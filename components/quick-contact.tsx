import { MessageCircle, Send } from 'lucide-react';

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
 * Floating contact area. The "Liên hệ" button opens the contact form page. Above it sit round buttons that open a direct chat
 * (Messenger, Instagram message, Zalo, WhatsApp, Telegram); only channels that really have a link are shown. All of them
 * give a small wiggle every few seconds to catch the eye.
 */
export function QuickContact({ lang, channels }: { lang: 'vi' | 'en'; channels: Channel[]; preview?: boolean }) {
  const vi = lang === 'vi';
  const shown = channels.filter((channel): channel is Channel & { url: string } => !!channel.url);
  const label = vi ? 'Liên hệ' : 'Contact';
  const chat = (name: string) => name === 'Facebook' ? 'Messenger' : name === 'Instagram' ? (vi ? 'nhắn tin Instagram' : 'Instagram message') : name;

  return <div className="qc-dock">
    {shown.length > 0 && <div className="qc-stack" role="group" aria-label={vi ? 'Nhắn tin trực tiếp' : 'Message us directly'}>
      {shown.map((channel, index) => <a key={channel.name} className={`qc-round is-${channel.name.toLowerCase()}`} style={{ '--i': index } as React.CSSProperties} href={channel.url} target="_blank" rel="noopener noreferrer" title={chat(channel.name)} aria-label={`${vi ? 'Nhắn tin qua' : 'Message us on'} ${chat(channel.name)} · ${vi ? 'mở trong tab mới' : 'opens in a new tab'}`}><ChannelIcon name={channel.name} /></a>)}
    </div>}
    <a className="qc-main" href={`/${lang}/contact`} title={vi ? 'Điền form liên hệ' : 'Fill in the contact form'}><MessageCircle size={20} aria-hidden="true" />{label}</a>
  </div>;
}
