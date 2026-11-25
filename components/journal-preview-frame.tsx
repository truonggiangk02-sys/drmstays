'use client';

import { useEffect, useState } from 'react';
import { JournalArticle } from '@/components/journal-views';
import type { Author } from '@/lib/authors';
import type { JournalPost } from '@/lib/journal';
import type { ContentImage } from '@/lib/site-content';

type Draft = { post: JournalPost; images: ContentImage[]; author: Author | null };

/**
 * The inside of the editor's preview iframe: draws the post being written with the real page component. The editor sends the
 * draft by postMessage (same site only) each time it changes; nothing is saved and nothing is rendered except through
 * JournalArticle, which escapes the Markdown.
 */
export function JournalPreviewFrame() {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    document.body.classList.add('je-embedded');
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as { type?: string } & Partial<Draft>;
      if (data?.type === 'journal-preview' && data.post) setDraft({ post: data.post, images: data.images || [], author: data.author || null });
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'journal-preview-ready' }, window.location.origin);
    return () => { window.removeEventListener('message', receive); document.body.classList.remove('je-embedded'); };
  }, []);
  return <div className="structure-site" lang="en">{draft ? <JournalArticle lang="en" post={draft.post} images={draft.images} author={draft.author} related={[]} building={null} /> : <p style={{ padding: 24 }}>…</p>}</div>;
}
