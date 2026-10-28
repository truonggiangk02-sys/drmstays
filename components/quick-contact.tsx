import { MessageCircle } from 'lucide-react';

type Channel = { name: string; url?: string; mark: string };

export function QuickContact({ lang, channels, preview = false }: { lang: 'vi' | 'en'; channels: Channel[]; preview?: boolean }) {
  const vi = lang === 'vi';
  const available = channels.filter((channel): channel is Channel & { url: string } => !!channel.url);

  if (!available.length && !preview) return <a className="quick-contact quick-contact-fallback" href={`/${lang}/contact`}><MessageCircle size={20} aria-hidden="true" />{vi ? 'Liên hệ DRM Stays' : 'Contact DRM Stays'}</a>;

  return <aside className="quick-contact" aria-label={vi ? 'Liên hệ nhanh' : 'Quick contact'}>
    {channels.filter(channel => preview || !!channel.url).map(channel => channel.url
      ? <a className={`quick-contact-link is-${channel.name.toLowerCase()}`} key={channel.name} href={channel.url} target="_blank" rel="noopener noreferrer" aria-label={`${vi ? 'Liên hệ qua' : 'Contact via'} ${channel.name} · ${vi ? 'mở trong tab mới' : 'opens in a new tab'}`}><span className="quick-contact-mark" aria-hidden="true">{channel.mark}</span><span className="quick-contact-name">{channel.name}</span></a>
      : <span className={`quick-contact-link is-${channel.name.toLowerCase()} is-unconfigured`} key={channel.name} aria-label={`${channel.name}: ${vi ? 'chưa cài link' : 'link not configured'}`}><span className="quick-contact-mark" aria-hidden="true">{channel.mark}</span><span className="quick-contact-name">{channel.name}</span><small>{vi ? 'Chưa cài link' : 'No link yet'}</small></span>)}
  </aside>;
}
