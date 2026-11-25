import Link from 'next/link';
import { imgSize } from '@/lib/image-url';
import { formatPostDate, readingMinutes, renderMarkdown, type JournalLang, type JournalPost } from '@/lib/journal';
import type { ContentImage } from '@/lib/site-content';

const words = {
  en: { label: 'DRM STAYS JOURNAL', lead: 'Practical guides for renting and living in Da Nang, from the team that runs our apartments.', read: 'Read the guide', min: 'min read', back: 'All guides', updated: 'Updated', ctaTitle: 'Looking for a place in Da Nang?', ctaBody: 'See our furnished apartments, prices and availability, or ask us anything. We reply in English, Japanese, Korean, Chinese, Russian and Vietnamese.', ctaStays: 'See apartments', ctaContact: 'Contact us', english: 'In English', empty: 'The first guides are on their way.' },
  vi: { label: 'CẨM NANG DRM STAYS', lead: 'Kinh nghiệm thuê nhà và sống ở Đà Nẵng, từ đội ngũ vận hành các tòa căn hộ của chúng tôi.', read: 'Đọc bài', min: 'phút đọc', back: 'Tất cả bài viết', updated: 'Cập nhật', ctaTitle: 'Bạn đang tìm chỗ ở tại Đà Nẵng?', ctaBody: 'Xem các căn hộ có sẵn nội thất, giá và tình trạng phòng, hoặc nhắn cho chúng tôi.', ctaStays: 'Xem căn hộ', ctaContact: 'Liên hệ', english: 'Tiếng Anh', empty: 'Các bài viết đầu tiên sắp ra mắt.' },
} as const;

/** The journal list: newest first, with cover, date, reading time and summary. Posts written only in English also appear on the Vietnamese list, marked. */
export function JournalIndex({ lang, title, posts, images }: { lang: JournalLang; title: string; posts: JournalPost[]; images: Record<string, ContentImage[]> }) {
  const w = words[lang];
  return <>
    <section className="structure-page-hero journal-hero"><span className="eyebrow">{w.label}</span><h1>{title}</h1><p>{w.lead}</p></section>
    <section className="structure-section journal-list">
      {posts.length ? posts.map(post => {
        const cover = images[post.id]?.[0];
        return <article key={post.id} className="journal-card">
          {cover && <Link href={`/${post.lang}/journal/${post.slug}`} tabIndex={-1} aria-hidden="true" className="journal-card-cover"><img src={cover.url} alt="" loading="lazy" {...imgSize(cover, '(max-width: 700px) 100vw, 360px')} /></Link>}
          <div className="journal-card-body">
            <p className="journal-meta">{formatPostDate(post.publishedAt, lang)}{post.publishedAt && ' · '}{readingMinutes(post.body)} {w.min}{post.lang !== lang && <> · <span lang="en">{w.english}</span></>}</p>
            <h2><Link href={`/${post.lang}/journal/${post.slug}`} lang={post.lang}>{post.title}</Link></h2>
            <p lang={post.lang}>{post.excerpt}</p>
            <Link className="structure-arrow" href={`/${post.lang}/journal/${post.slug}`}>{w.read}</Link>
          </div>
        </article>;
      }) : <p>{w.empty}</p>}
    </section>
  </>;
}

/** One post: title, date, cover, the Markdown body and a closing call to action. */
export function JournalArticle({ lang, post, images }: { lang: JournalLang; post: JournalPost; images: ContentImage[] }) {
  const w = words[lang];
  const cover = images[0];
  const updated = post.updatedAt && post.updatedAt !== post.publishedAt ? formatPostDate(post.updatedAt, lang) : '';
  return <article className="journal-article">
    <header className="structure-page-hero journal-hero">
      <Link className="structure-back" href={`/${lang}/journal`}>← {w.back}</Link>
      <h1>{post.title}</h1>
      <p className="journal-meta"><time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, lang)}</time>{updated && <> · {w.updated} <time dateTime={post.updatedAt}>{updated}</time></>} · {readingMinutes(post.body)} {w.min}</p>
      <p className="journal-lead">{post.excerpt}</p>
    </header>
    <div className="structure-section journal-body-wrap">
      {cover && <img className="journal-cover" src={cover.url} alt={cover.alt || post.title} fetchPriority="high" {...imgSize(cover, '(max-width: 900px) 100vw, 860px')} />}
      <div className="journal-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
      {images.length > 1 && <div className="journal-gallery">{images.slice(1).map(image => <img key={image.id} src={image.url} alt={image.alt || post.title} loading="lazy" {...imgSize(image, '(max-width: 700px) 100vw, 420px')} />)}</div>}
      <aside className="journal-cta">
        <h2>{w.ctaTitle}</h2><p>{w.ctaBody}</p>
        <div><Link className="structure-button" href={`/${lang}/stays`}>{w.ctaStays}</Link><Link className="structure-arrow" href={`/${lang}/contact`}>{w.ctaContact}</Link></div>
      </aside>
    </div>
  </article>;
}
