import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { channelNames, getContactChannels } from '@/lib/contact-channels';

export const dynamic = 'force-dynamic';

const labels = { whatsapp: 'WhatsApp', telegram: 'Telegram', facebook: 'Facebook / Messenger', zalo: 'Zalo' };
const hints = { whatsapp: 'Số có mã quốc gia, ví dụ +84…, hoặc link https://wa.me/…', telegram: 'Link https://t.me/…', facebook: 'Link fanpage https://facebook.com/… hoặc Messenger https://m.me/…', zalo: 'Link OA/cá nhân https://zalo.me/…' };

export default async function ContactChannelsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const channels = await getContactChannels();
  const status = await searchParams;
  return <AdminShell title="Liên hệ nhanh">
    <p className="admin-hint">Nhập tài khoản chính thức của DRM Stays. Chỉ kênh đã bật và có link hợp lệ mới mở được cho khách trên website.</p>
    {status.saved === '1' && <p role="status" className="contact-admin-success">Đã lưu các kênh liên hệ.</p>}
    {status.error === 'invalid' && <p role="alert" className="translation-error">Kiểm tra lại link và kênh đã bật. Link phải dùng HTTPS và đúng nền tảng.</p>}
    <form className="contact-admin-form" action="/api/admin/contact-channels" method="post">
      {channelNames.map(channel => <fieldset key={channel}>
        <legend>{labels[channel]}</legend>
        <label htmlFor={`${channel}-url`}>Số hoặc đường dẫn<input id={`${channel}-url`} name={`${channel}Url`} type="text" inputMode={channel === 'whatsapp' ? 'tel' : 'url'} maxLength={300} defaultValue={channels[channel].url} placeholder={hints[channel]} /></label>
        <small>{hints[channel]}</small>
        <label className="contact-admin-toggle"><input type="checkbox" name={`${channel}Published`} defaultChecked={channels[channel].published} /> Hiển thị kênh này cho khách</label>
      </fieldset>)}
      <button type="submit">Lưu các kênh liên hệ</button>
    </form>
  </AdminShell>;
}
