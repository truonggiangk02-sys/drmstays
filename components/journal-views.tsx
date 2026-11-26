import Link from 'next/link';
import { catalogImageUrl, imgSize } from '@/lib/image-url';
import { formatPostDate, mediaImageId, markdownLinks, readingMinutes, renderMarkdownFull } from '@/lib/journal-markdown';
// Types only: this file also runs in the admin editor's preview, where nothing from the server may be imported.
import type { JournalLang, JournalPost } from '@/lib/journal';
import type { Author } from '@/lib/authors';
import type { ContentImage } from '@/lib/site-content';

const words = {
  en: { label: 'DRM STAYS JOURNAL', lead: 'Practical guides for renting and living in Da Nang, from the team that runs our apartments.', read: 'Read the guide', min: 'min read', back: 'All guides', updated: 'Updated', ctaTitle: 'Looking for a place in Da Nang?', ctaBody: 'See our furnished apartments, prices and availability, or ask us anything. We reply in English, Japanese, Korean, Chinese, Russian and Vietnamese.', ctaStays: 'See apartments', ctaContact: 'Contact us', english: 'In English', empty: 'The first guides are on their way.', contents: 'On this page', writtenBy: 'Written by', more: 'More guides', moreTopic: 'Keep reading', building: 'See the building', aboutAuthor: 'About the author' },
  vi: { label: 'CẨM NANG DRM STAYS', lead: 'Kinh nghiệm thuê nhà và sống ở Đà Nẵng, từ đội ngũ vận hành các tòa căn hộ của chúng tôi.', read: 'Đọc bài', min: 'phút đọc', back: 'Tất cả bài viết', updated: 'Cập nhật', ctaTitle: 'Bạn đang tìm chỗ ở tại Đà Nẵng?', ctaBody: 'Xem các căn hộ có sẵn nội thất, giá và tình trạng phòng, hoặc nhắn cho chúng tôi.', ctaStays: 'Xem căn hộ', ctaContact: 'Liên hệ', english: 'Tiếng Anh', empty: 'Các bài viết đầu tiên sắp ra mắt.', contents: 'Trong bài này', writtenBy: 'Tác giả', more: 'Bài viết khác', moreTopic: 'Đọc tiếp', building: 'Xem tòa nhà', aboutAuthor: 'Về tác giả' },
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

/**
 * One post: title, date, cover, contents list, the Markdown body (with its pictures), the author, related guides and a closing
 * call to action. `images` are the post's photos, the cover first; photos the body does not show are listed under it.
 */
export function JournalArticle({ lang, post, images, author = null, related = [], building = null }: {
  lang: JournalLang; post: JournalPost; images: ContentImage[]; author?: Author | null; related?: JournalPost[]; building?: { id: string; name: string } | null;
}) {
  const w = words[lang];
  const cover = images[0];
  const updated = post.updatedAt && post.updatedAt !== post.publishedAt ? formatPostDate(post.updatedAt, lang) : '';
  const library = Object.fromEntries(images.map(image => [image.id, { width: image.width, height: image.height, alt: image.alt }]));
  const { html, headings } = renderMarkdownFull(post.body, { images: library });
  const contents = headings.filter(heading => heading.level === 2);
  // The contents list: each ## with its ### parts under it (the ### are not counted for showing the list).
  const tree = headings.filter(heading => heading.level === 2 || heading.level === 3).reduce<Array<{ main: (typeof headings)[number]; parts: typeof headings }>>((list, heading) => {
    if (heading.level === 2) list.push({ main: heading, parts: [] }); else list[list.length - 1]?.parts.push(heading);
    return list;
  }, []);
  const shown = new Set(markdownLinks(post.body).filter(link => link.image).map(link => mediaImageId(link.url)).filter(Boolean));
  const extra = images.slice(1).filter(image => !shown.has(image.id));
  const authorPhoto = author?.photo_id ? catalogImageUrl(author.photo_id) : '';
  const authorLink = author && /^https:\/\/\S+$/i.test(author.url.trim()) ? author.url.trim() : '';
  return <article className="journal-article">
    <header className="structure-page-hero journal-hero">
      <Link className="structure-back" href={`/${lang}/journal`}>← {w.back}</Link>
      <h1>{post.title}</h1>
      <p className="journal-meta">{author && <>{w.writtenBy} <strong>{author.name}</strong>{author.role && `, ${author.role}`} · </>}<time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, lang)}</time>{updated && <> · {w.updated} <time dateTime={post.updatedAt}>{updated}</time></>} · {readingMinutes(post.body)} {w.min}</p>
      <p className="journal-lead">{post.excerpt}</p>
    </header>
    <div className="structure-section journal-body-wrap">
      {cover && <img className="journal-cover" src={cover.url} alt={cover.alt || post.title} fetchPriority="high" {...imgSize(cover, '(max-width: 900px) 100vw, 860px')} />}
      {contents.length >= 3 && <nav className="journal-toc" aria-label={w.contents}><strong>{w.contents}</strong><ol>{tree.map(({ main, parts }) => <li key={main.id}><a href={`#${main.id}`}>{main.text}</a>{parts.length > 0 && <ol>{parts.map(part => <li key={part.id}><a href={`#${part.id}`}>{part.text}</a></li>)}</ol>}</li>)}</ol></nav>}
      <div className="journal-body" dangerouslySetInnerHTML={{ __html: html }} />
      {extra.length > 0 && <div className="journal-gallery">{extra.map(image => <img key={image.id} src={image.url} alt={image.alt || post.title} loading="lazy" {...imgSize(image, '(max-width: 700px) 100vw, 420px')} />)}</div>}
      {author && <aside className="journal-author" aria-label={w.aboutAuthor}>
        {authorPhoto && <img src={authorPhoto} alt={author.name} width={72} height={72} loading="lazy" />}
        <div><p className="journal-author-name">{w.writtenBy} <strong>{authorLink ? <a href={authorLink} rel="noopener noreferrer">{author.name}</a> : author.name}</strong>{author.role && <span>, {author.role}</span>}</p>{author.bio && <p>{author.bio}</p>}</div>
      </aside>}
      {(related.length > 0 || building) && <aside className="journal-related" aria-label={w.more}>
        <h2>{related.length ? w.more : w.moreTopic}</h2>
        <ul>{related.map(item => <li key={item.id}><Link href={`/${item.lang}/journal/${item.slug}`} lang={item.lang}>{item.title}</Link></li>)}{building && <li><Link href={`/${lang}/buildings/${building.id}`}>{w.building}: {building.name}</Link></li>}</ul>
      </aside>}
      <aside className="journal-cta">
        <h2>{w.ctaTitle}</h2><p>{w.ctaBody}</p>
        <div><Link className="structure-button" href={`/${lang}/stays`}>{w.ctaStays}</Link><Link className="structure-arrow" href={`/${lang}/contact`}>{w.ctaContact}</Link></div>
      </aside>
    </div>
  </article>;
}
