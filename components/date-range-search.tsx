'use client';

import { useState, type FormEvent } from 'react';

type Lang = 'vi' | 'en';

export function DateRangeSearch({ lang, checkIn = '', checkOut = '' }: { lang: Lang; checkIn?: string; checkOut?: string }) {
  const [start, setStart] = useState(checkIn);
  const [end, setEnd] = useState(checkOut);
  const [showError, setShowError] = useState(false);
  const copy = lang === 'vi'
    ? { checkIn: 'Ngày nhận phòng', checkOut: 'Ngày trả phòng', search: 'Xem phòng', error: 'Ngày trả phòng phải sau ngày nhận phòng.' }
    : { checkIn: 'Check-in', checkOut: 'Check-out', search: 'Explore rooms', error: 'Check-out must be after check-in.' };
  const invalid = !!start && !!end && end <= start;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (invalid) {
      event.preventDefault();
      setShowError(true);
    }
  }

  return <form className="structure-search" action={`/${lang}/stays`} onSubmit={handleSubmit}>
    <label>{copy.checkIn}<input type="date" name="checkIn" value={start} required onChange={event => { setStart(event.target.value); setShowError(false); }} /></label>
    <label>{copy.checkOut}<input type="date" name="checkOut" value={end} required aria-invalid={showError && invalid} aria-describedby={showError && invalid ? 'stay-date-error' : undefined} onChange={event => { setEnd(event.target.value); setShowError(false); }} /></label>
    <button type="submit">{copy.search}</button>
    {showError && invalid && <p id="stay-date-error" className="structure-search-error" role="alert">{copy.error}</p>}
  </form>;
}
