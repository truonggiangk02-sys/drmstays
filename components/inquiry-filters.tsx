import Link from 'next/link';
import { INQUIRY_STATUSES, STATUS_LABEL, type InquiryStatus } from '@/lib/inquiries';

/** Status tabs with counts and a search box for the contact lists. Plain links and a GET form, no script needed. */
export function InquiryFilters({ base, status, q, counts }: { base: string; status?: string; q?: string; counts: Record<InquiryStatus | 'all', number> }) {
  const href = (next?: string) => { const params = new URLSearchParams(); if (next) params.set('status', next); if (q) params.set('q', q); const text = params.toString(); return text ? `${base}?${text}` : base; };
  return <div className="inq-filters">
    <nav aria-label="Lọc theo trạng thái">
      <Link href={href()} className={!status ? 'is-active' : ''}>Tất cả <b>{counts.all}</b></Link>
      {INQUIRY_STATUSES.map(item => <Link key={item} href={href(item)} className={status === item ? 'is-active' : ''}>{STATUS_LABEL[item]} <b>{counts[item]}</b></Link>)}
    </nav>
    <form action={base} method="get" role="search">
      {status && <input type="hidden" name="status" value={status} />}
      <input type="search" name="q" defaultValue={q || ''} placeholder="Tìm theo tên, số điện thoại, email, nội dung" maxLength={80} aria-label="Tìm yêu cầu" />
      <button>Tìm</button>{q && <Link href={href(status)}>Xóa tìm</Link>}
    </form>
  </div>;
}
