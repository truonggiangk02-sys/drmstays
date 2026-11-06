'use client';

import { useEffect, useRef, useState } from 'react';

const SMALL_ENOUGH = 3_500_000; // bytes; anything bigger is shrunk in the browser before upload
const MAX_SIDE = 2400;
const BATCH_BYTES = 18_000_000; // keep each request under the server's limit

async function shrink(file: File): Promise<File> {
  if (file.size <= SMALL_ENOUGH || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return file; }
}

/**
 * Put inside an upload <form>. Lets the owner pick many photos at once, shrinks oversized phone photos,
 * uploads them in small batches with a progress line, then reloads. Without JavaScript the plain form still works.
 */
export function PhotoUploadEnhancer() {
  const anchor = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const form = anchor.current?.closest('form');
    if (!form) return;
    async function submit(event: SubmitEvent) {
      event.preventDefault();
      const input = form!.querySelector<HTMLInputElement>('input[type=file]');
      const chosen = Array.from(input?.files || []);
      if (!chosen.length) return;
      const button = form!.querySelector<HTMLButtonElement>('button:not([type=button])');
      if (button) button.disabled = true;
      const problems: string[] = [];
      let done = 0;
      try {
        const files: File[] = [];
        for (const [index, file] of chosen.entries()) { setStatus(`Đang xử lý ${index + 1}/${chosen.length}…`); files.push(await shrink(file)); }
        const batches: File[][] = [[]];
        let size = 0;
        for (const file of files) {
          if (size + file.size > BATCH_BYTES && batches.at(-1)!.length) { batches.push([]); size = 0; }
          batches.at(-1)!.push(file); size += file.size;
        }
        for (const batch of batches) {
          setStatus(`Đang tải lên ${done}/${files.length} ảnh…`);
          const data = new FormData(form!);
          data.delete('image');
          for (const file of batch) data.append('image', file);
          const response = await fetch(form!.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          const result = await response.json().catch(() => null) as { uploaded?: number; failed?: string[] } | null;
          if (!result) { problems.push(`Lỗi ${response.status}`); break; }
          done += result.uploaded || 0;
          problems.push(...(result.failed || []));
        }
      } catch { problems.push('Mất kết nối'); }
      if (!problems.length) { window.location.reload(); return; }
      setStatus(`Đã tải ${done}/${chosen.length} ảnh. Lỗi: ${problems.join('; ')}`);
      if (button) button.disabled = false;
      if (done) setTimeout(() => window.location.reload(), 4000);
    }
    form.addEventListener('submit', submit);
    return () => form.removeEventListener('submit', submit);
  }, []);

  return <span ref={anchor} role="status" className="photo-upload-status">{status}</span>;
}
