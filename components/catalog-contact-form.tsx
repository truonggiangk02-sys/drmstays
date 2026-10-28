'use client';

import { useState, type FormEvent } from 'react';

type Lang = 'vi' | 'en';

export function CatalogContactForm({ lang, roomId, checkIn, checkOut }: { lang: Lang; roomId: string; checkIn?: string; checkOut?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const t = lang === 'vi' ? {
    name: 'Họ tên', phone: 'Số điện thoại / WhatsApp', email: 'Email (không bắt buộc)', checkIn: 'Ngày nhận phòng', checkOut: 'Ngày trả phòng', request: 'Nội dung yêu cầu', send: 'Gửi yêu cầu', sending: 'Đang gửi…',
    note: 'Gửi form chưa phải là đặt phòng hoặc thanh toán.', success: 'Đã nhận thông tin. Đội ngũ sẽ liên hệ lại.', invalidDates: 'Nếu nhập ngày, hãy chọn đủ hai ngày và để ngày trả sau ngày nhận.', invalid: 'Hãy kiểm tra lại số điện thoại và thông tin liên hệ.', roomUnavailable: 'Phòng này hiện không nhận yêu cầu. Hãy xem phòng khác hoặc liên hệ trực tiếp.', unavailable: 'Form hiện chưa gửi được. Vui lòng thử lại sau.', tooMany: 'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.',
  } : {
    name: 'Your name', phone: 'Phone / WhatsApp', email: 'Email (optional)', checkIn: 'Check-in', checkOut: 'Check-out', request: 'Your request', send: 'Send request', sending: 'Sending…',
    note: 'This is an inquiry, not a reservation or payment.', success: 'Your inquiry has been received. Our team will contact you.', invalidDates: 'If you enter dates, choose both and set check-out after check-in.', invalid: 'Please check your phone number and contact details.', roomUnavailable: 'This room cannot receive inquiries right now. Please explore another room or contact us directly.', unavailable: 'The form is temporarily unavailable. Please try again later.', tooMany: 'You have sent several requests. Please try again later.',
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const start = String(data.get('checkIn') || '');
    const end = String(data.get('checkOut') || '');
    if (!!start !== !!end || (start && end <= start)) {
      setMessage({ kind: 'error', text: t.invalidDates });
      return;
    }
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch('/api/catalog-inquiries', { method: 'POST', body: data, redirect: 'manual' });
      if (response.type === 'opaqueredirect' || response.status === 303) {
        setMessage({ kind: 'success', text: t.success });
      } else if (response.status === 400) {
        setMessage({ kind: 'error', text: t.invalid });
      } else if (response.status === 404) {
        setMessage({ kind: 'error', text: t.roomUnavailable });
      } else if (response.status === 429) {
        setMessage({ kind: 'error', text: t.tooMany });
      } else {
        setMessage({ kind: 'error', text: t.unavailable });
      }
    } catch {
      setMessage({ kind: 'error', text: t.unavailable });
    } finally {
      setPending(false);
    }
  }

  if (message?.kind === 'success') return <p className="structure-form-feedback is-success" role="status">{message.text}</p>;

  return <form className="structure-form" action="/api/catalog-inquiries" method="post" onSubmit={submit} aria-busy={pending}>
    <input type="hidden" name="sourceRoomId" value={roomId} /><input type="hidden" name="lang" value={lang} />
    <label>{t.name}<input name="name" required maxLength={100} autoComplete="name" /></label>
    <label>{t.phone}<input name="phone" type="tel" required maxLength={24} autoComplete="tel" /></label>
    <label>{t.email}<input name="email" type="email" maxLength={254} autoComplete="email" /></label>
    <div className="structure-form-pair"><label>{t.checkIn}<input name="checkIn" type="date" defaultValue={checkIn} /></label><label>{t.checkOut}<input name="checkOut" type="date" defaultValue={checkOut} /></label></div>
    <label>{t.request}<textarea name="message" rows={4} maxLength={1000} /></label>
    <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {message?.kind === 'error' && <p className="structure-form-feedback is-error" role="alert">{message.text}</p>}
    <button type="submit" disabled={pending}>{pending ? t.sending : t.send}</button><small>{t.note}</small>
  </form>;
}
