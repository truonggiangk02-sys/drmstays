import { ArrowDown } from 'lucide-react';
import { imgSize } from '@/lib/image-url';
import { RoomTypesBrowser, type BrowserBuilding } from '@/components/room-types-browser';

type Photo = { url: string; alt: string; width?: number; height?: number };

export function RoomTypesPage({ lang, title, buildings, dateQuery, empty }: { lang: 'vi' | 'en'; title: string; buildings: BrowserBuilding[]; dateQuery: string; empty: string }) {
  const vi = lang === 'vi';
  const heroPhoto: Photo | undefined = buildings.flatMap(building => building.types.flatMap(type => type.images))[0] || buildings.find(building => building.cover)?.cover;
  const list = buildings.filter(building => building.types.length > 0);
  return <div className="rt">
    <section className="rt-hero" aria-labelledby="rt-title">
      <div className="rt-hero-inner">
        <div className="rt-hero-text">
          <span className="rt-eyebrow">DRM STAYS / {vi ? 'PHÒNG TIÊU BIỂU' : 'FEATURED ROOMS'}</span>
          <h1 id="rt-title">{title}</h1>
          <p>{vi ? 'Chọn kiểu phòng hợp với bạn: diện tích, số giường, giá và tòa nhà. Bấm vào từng loại để xem ảnh, tiện ích và các phòng đang có.' : 'Pick the room style that suits you: size, beds, price and building. Open any type for photos, amenities and the rooms available.'}</p>
          <a className="rt-cta" href="#rt-list">{vi ? 'Xem các loại phòng' : 'See the room types'}<ArrowDown size={16} aria-hidden="true" /></a>
        </div>
        {heroPhoto && <figure className="rt-hero-photo"><img src={heroPhoto.url} alt={heroPhoto.alt || ''} fetchPriority="high" {...imgSize(heroPhoto)} /></figure>}
      </div>
    </section>
    <section className="rt-list" id="rt-list">{list.length > 0 ? <RoomTypesBrowser lang={lang} buildings={list} dateQuery={dateQuery} /> : <p className="rt-empty">{empty}</p>}</section>
  </div>;
}
