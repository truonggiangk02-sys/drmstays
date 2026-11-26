import { redirect } from 'next/navigation';
import { JournalPreviewFrame } from '@/components/journal-preview-frame';
import { isAdmin } from '@/lib/admin';
// The same stylesheets as the public pages, so the preview looks exactly like the live post.
import '../../../../detail.css';
import '../../../../home-story.css';
import '../../../../services.css';
import '../../../../investors.css';
import '../../../../about.css';
import '../../../../room-types.css';
import '../../../../polish.css';

export const dynamic = 'force-dynamic';

/** Shown inside the editor's "page preview" tab (an iframe, so the page gets a real screen width). Admin only. */
export default async function JournalPreview() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <JournalPreviewFrame />;
}
