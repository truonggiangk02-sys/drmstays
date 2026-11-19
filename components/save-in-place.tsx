'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Admin forms marked data-save-in-place are sent in the background: the page keeps its scroll position and the
 * cursor stays where it was. The server data is then refreshed (router.refresh keeps scroll and typed text).
 * Without JavaScript the form still posts normally.
 */
export function SaveInPlace() {
  const router = useRouter();
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const show = (text: string, bad = false) => { setNote({ text, bad }); clearTimeout(timer.current); timer.current = setTimeout(() => setNote(null), bad ? 6000 : 2500); };
    const onSubmit = async (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-save-in-place') || event.defaultPrevented) return;
      event.preventDefault();
      const button = event.submitter instanceof HTMLButtonElement ? event.submitter : null;
      if (button) button.disabled = true;
      try {
        // getAttribute: a hidden input named "action" shadows form.action
        const body = new FormData(form, event.submitter);
        // redirect: 'manual' - the server answers a successful save with a redirect; there is no need to load that page here
        const response = await fetch(form.getAttribute('action') || window.location.pathname, { method: 'POST', body, credentials: 'same-origin', redirect: 'manual' });
        if (response.type !== 'opaqueredirect' && !response.ok) throw new Error(String(response.status));
        show('Đã lưu');
        if (form.getAttribute('data-save-in-place') !== 'quiet') router.refresh();
      } catch (error) {
        show(`Chưa lưu được (${error instanceof Error ? error.message : 'lỗi mạng'}). Thử lại hoặc tải lại trang.`, true);
      } finally { if (button) button.disabled = false; }
    };
    document.addEventListener('submit', onSubmit);
    return () => { document.removeEventListener('submit', onSubmit); clearTimeout(timer.current); };
  }, [router]);
  return note ? <div className={`save-note${note.bad ? ' is-bad' : ''}`} role="status">{note.text}</div> : null;
}
