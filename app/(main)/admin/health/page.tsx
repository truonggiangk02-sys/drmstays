import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { runHealthChecks } from '@/lib/health';

export const dynamic = 'force-dynamic';
const icon = { ok: '✔', warn: '!', fail: '✖' } as const;

export default async function HealthPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const checks = await runHealthChecks();
  const groups = [...new Set(checks.map(check => check.group))];
  const failed = checks.filter(check => check.status === 'fail').length, warned = checks.filter(check => check.status === 'warn').length;
  return <AdminShell title="Kiểm tra web">
    <p className={`hc-summary ${failed ? 'is-fail' : warned ? 'is-warn' : 'is-ok'}`}>{failed ? `${failed} lỗi cần sửa` : warned ? `Không có lỗi, ${warned} điều cần chú ý` : 'Mọi thứ đều ổn'} · {checks.length} mục kiểm tra. Tải lại trang để kiểm tra lại.</p>
    {groups.map(group => <section className="hc-group" key={group}><h2>{group}</h2><ul>{checks.filter(check => check.group === group).map(check => <li key={check.id} className={`is-${check.status}`}><i aria-hidden="true">{icon[check.status]}</i><div><strong>{check.label}</strong><span>{check.detail}</span></div></li>)}</ul></section>)}
    <style>{`.hc-summary{padding:14px 18px;font-weight:700;border-left:5px solid}.hc-summary.is-ok{background:#e3f1e8;border-color:#2f8f5b}.hc-summary.is-warn{background:#fbf1de;border-color:#c98a1b}.hc-summary.is-fail{background:#fbe5e1;border-color:#c24433}
.hc-group{margin:26px 0}.hc-group h2{margin:0 0 10px;font:400 26px 'Playfair Display',Georgia,serif}.hc-group ul{margin:0;padding:0;list-style:none;border:1px solid #dce4da;background:#fff}
.hc-group li{display:flex;gap:14px;align-items:flex-start;padding:13px 16px;border-top:1px solid #edf1ea}.hc-group li:first-child{border-top:0}.hc-group li i{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-style:normal;font-weight:700;color:#fff}
.hc-group li.is-ok i{background:#2f8f5b}.hc-group li.is-warn i{background:#c98a1b}.hc-group li.is-fail i{background:#c24433}.hc-group li strong{display:block}.hc-group li span{display:block;margin-top:2px;font-size:14px;line-height:1.5;color:#4f6054;overflow-wrap:anywhere}`}</style>
  </AdminShell>;
}
