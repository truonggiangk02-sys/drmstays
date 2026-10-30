'use client';

import { useRef, useState } from 'react';
import { NOT_COPIED, type CopyOption } from '@/lib/room-copy';

/** Fills this room's form from another saved room. Nothing is saved until the owner reviews it and presses Save. */
export function CopyRoomDetails({ options }: { options: CopyOption[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  if (!options.length) return null;

  function copy() {
    const form = root.current?.closest('form');
    const source = document.getElementById('room-copy-data');
    if (!form || !source || !from) { setNote('Chọn một phòng nguồn trước. / Choose a source room first.'); return; }
    let data: Record<string, Record<string, string>>;
    try { data = JSON.parse(source.textContent || '{}'); } catch { setNote('Không đọc được dữ liệu phòng. / Could not read room data.'); return; }
    const values = data[from];
    if (!values) { setNote('Phòng này chưa có thông tin để chép. / That room has nothing to copy yet.'); return; }
    let filled = 0;
    for (const [name, value] of Object.entries(values)) {
      if ((NOT_COPIED as readonly string[]).includes(name)) continue;
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) { field.value = value; filled += 1; }
    }
    setNote(`Đã điền ${filled} ô. CHƯA LƯU: kiểm tra lại (số tầng, giá, tên...) rồi bấm Save. / Filled ${filled} fields. NOT SAVED yet: review, then press Save.`);
  }

  return <div className="catalog-copy" ref={root}>
    <label>Sao chép thông tin từ phòng khác / Copy details from another room
      <select value={from} onChange={event => { setFrom(event.target.value); setNote(''); }}>
        <option value="">— Chọn phòng / Choose a room —</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
    <button type="button" onClick={copy}>Điền vào form / Fill this form</button>
    <small>Không chép số tầng và không đổi trạng thái hiển thị. / Floor and visibility are not copied.</small>
    {note && <p role="status">{note}</p>}
  </div>;
}
