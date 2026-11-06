import type { Metadata } from "next";
import "../../coming-soon.css";
import { getContactChannels } from "@/lib/contact-channels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "DRM Stays | Sắp ra mắt / Coming soon" },
  description: "DRM Stays, căn hộ dịch vụ tại Đà Nẵng, sắp ra mắt. / Serviced apartments in Da Nang, coming soon.",
  robots: { index: false, follow: false },
};

const labels = { whatsapp: "WhatsApp", telegram: "Telegram", facebook: "Facebook", zalo: "Zalo" } as const;

/** Shown on every public URL while COMING_SOON=1 (see build/sites-worker.ts). Contact buttons appear once published in the admin. */
export default async function ComingSoon() {
  const channels = await getContactChannels();
  const links = (Object.keys(labels) as Array<keyof typeof labels>).filter(key => channels[key].published && channels[key].url);
  return <main className="coming-soon" id="main-content"><div className="coming-soon-card">
    <img className="coming-soon-logo" src="/drm-stay-logo.png" alt="DRM Stays" width={96} height={96} />
    <p className="coming-soon-kicker">DRM Stays · Đà Nẵng</p>
    <h1>Sắp ra mắt</h1>
    <hr className="coming-soon-rule" />
    <p lang="vi">Chúng tôi đang hoàn thiện không gian lưu trú mới tại Đà Nẵng. Rất mong được đón bạn trong thời gian tới.</p>
    <p lang="en" className="coming-soon-en">Our new serviced apartments in Da Nang are almost ready. We look forward to welcoming you soon.</p>
    <p className="coming-soon-tag">Your Stay, Our Care.</p>
    {links.length > 0 && <nav className="coming-soon-links" aria-label="Liên hệ / Contact">{links.map(key => <a key={key} href={channels[key].url} rel="noopener noreferrer" target="_blank">{labels[key]}</a>)}</nav>}
    <p className="coming-soon-foot">DRMSTAYS.VN</p>
  </div></main>;
}
