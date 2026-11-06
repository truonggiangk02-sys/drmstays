import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import '../../../catalog-admin.css';
import { AdminShell } from '@/components/admin-shell';
import { CatalogPhotos, type CatalogImageRow } from '@/components/catalog-photos';
import { CopyRoomDetails } from '@/components/copy-room-details';
import { isAdmin } from '@/lib/admin';
import { inferFloor, parseDetails, type BuildingDetails, type RoomDetails } from '@/lib/catalog-details';
import { buildingProgress, groupByFloor, roomProgress, type Progress } from '@/lib/catalog-progress';
import { buildCopySource } from '@/lib/room-copy';
import { jsonLd } from '@/lib/site';
import { getFreshStaydeskCatalog } from '@/lib/staydesk-catalog';

export const dynamic = 'force-dynamic';

type BuildingRow = { source_id: string; published: number; address: string; details_json: string };
type RoomRow = { source_id: string; published: number; monthly_price: number; details_json: string };
type Tab = 'info' | 'text' | 'photos' | 'rooms';
const tabLabels: Record<Tab, string> = { info: 'Thông tin', text: 'Mô tả & tiện ích', photos: 'Ảnh', rooms: 'Phòng trong tòa' };

function Field({ name, label, value, type = 'text', maxLength, hint }: { name: string; label: string; value?: string | number; type?: string; maxLength?: number; hint?: string }) {
  return <label className="cx-field"><span>{label}</span><input name={name} type={type} min={type === 'number' ? 0 : undefined} defaultValue={value || ''} maxLength={maxLength} />{hint && <small>{hint}</small>}</label>;
}
function Pair({ title, children }: { title?: string; children: React.ReactNode }) {
  return <div className="cx-pair">{title && <h4>{title}</h4>}<div>{children}</div></div>;
}
function Area({ name, label, value, lines }: { name: string; label: string; value?: string | string[]; lines?: boolean }) {
  const text = Array.isArray(value) ? value.join('\n') : value;
  return <label className="cx-field"><span>{label}{lines && <em> · mỗi dòng một mục</em>}</span><textarea name={name} defaultValue={text || ''} rows={lines ? 6 : 5} /></label>;
}
function Meter({ progress }: { progress: Progress }) {
  const percent = Math.round((progress.done / progress.total) * 100);
  return <div className="cx-meter" title={progress.missing.length ? `Còn thiếu: ${progress.missing.join(', ')}` : 'Đã đủ thông tin'}>
    <div><span style={{ width: `${percent}%` }} /></div><small>{progress.done}/{progress.total}{progress.missing.length ? ` · thiếu ${progress.missing.slice(0, 3).join(', ')}${progress.missing.length > 3 ? '…' : ''}` : ' · đủ'}</small>
  </div>;
}

export default async function CatalogAdminPage({ searchParams }: { searchParams: Promise<{ b?: string; r?: string; tab?: string; saved?: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB) return <AdminShell title="Property catalog"><p>Database unavailable.</p></AdminShell>;
  let source;
  try { source = await getFreshStaydeskCatalog(); }
  catch { return <AdminShell title="Property catalog"><p>Staydesk is unavailable. Configure the private catalog connection first.</p></AdminShell>; }
  const query = await searchParams;
  const [buildingsResult, roomsResult, imagesResult] = await Promise.all([
    env.DB.prepare('SELECT source_id, published, address, details_json FROM catalog_buildings').all<BuildingRow>(),
    env.DB.prepare('SELECT source_id, published, monthly_price, details_json FROM catalog_rooms').all<RoomRow>(),
    env.DB.prepare('SELECT id, owner_type, owner_id, alt, category FROM catalog_images ORDER BY position, id').all<CatalogImageRow>(),
  ]);
  const buildingRows = new Map((buildingsResult.results || []).map(row => [row.source_id, row]));
  const roomRows = new Map((roomsResult.results || []).map(row => [row.source_id, row]));
  const copySource = buildCopySource(source.buildings, roomRows);
  const gallery = (kind: string, id: string) => (imagesResult.results || []).filter(image => image.owner_type === kind && image.owner_id === id);
  const photoCount = (kind: string, id: string) => gallery(kind, id).filter(image => image.category === 'photo').length;

  const building = source.buildings.find(item => item.id === query.b) || source.buildings[0];
  if (!building) return <AdminShell title="Property catalog"><p>Staydesk chưa có tòa nhà nào.</p></AdminShell>;
  const room = building.rooms.find(item => item.id === query.r);
  const tab: Tab = (['info', 'text', 'photos', 'rooms'] as const).find(item => item === query.tab && (item !== 'rooms' || !room)) || 'info';

  const view = (b: string, r?: string) => `/admin/catalog?b=${b}${r ? `&r=${r}` : ''}`;
  const roomName = new Map(source.buildings.flatMap(item => item.rooms.map(entry => [entry.id, entry.name] as const)));
  const roomInfo = (roomId: string) => {
    const row = roomRows.get(roomId), detail = parseDetails<RoomDetails>(row?.details_json);
    // A floor typed in the form wins; otherwise it is read from the room number ("301" is floor 3).
    const floor = detail.floor || inferFloor(roomName.get(roomId) || '');
    return { row, detail, floor, progress: roomProgress(row, { ...detail, floor }, photoCount('room', roomId)) };
  };

  const buildingRow = buildingRows.get(building.id), buildingDetail = parseDetails<BuildingDetails>(buildingRow?.details_json);
  const buildingProg = buildingProgress(buildingRow, buildingDetail, photoCount('building', building.id));
  const floors = groupByFloor(building.rooms.map(item => ({ id: item.id, name: item.name, ...roomInfo(item.id) })));
  const tabs: Tab[] = room ? ['info', 'text', 'photos'] : ['info', 'text', 'photos', 'rooms'];

  const target = room ? { kind: 'room' as const, id: room.id, name: room.name } : { kind: 'building' as const, id: building.id, name: building.name };
  const row = room ? roomRows.get(room.id) : buildingRow;
  const published = row?.published === 1;
  const roomDetail = room ? roomInfo(room.id).detail : {};
  const progress = room ? roomInfo(room.id).progress : buildingProg;

  return <AdminShell title="Property catalog"><div className="cx">
    <aside className="cx-nav" aria-label="Chọn tòa và phòng"><details open>
      <summary>Tòa và phòng</summary>
      {source.buildings.map(item => {
        const itemRow = buildingRows.get(item.id), open = item.id === building.id;
        return <div key={item.id} className={open ? 'cx-nav-building is-open' : 'cx-nav-building'}>
          <Link href={view(item.id)} className={open && !room ? 'is-active' : ''}><i className={itemRow?.published === 1 ? 'dot is-on' : 'dot'} aria-hidden="true" />{item.name}<small>{item.rooms.length} phòng</small></Link>
          {open && floors.map(group => <div key={group.floor || 'none'} className="cx-nav-floor">
            <h3>{group.floor ? `Tầng ${group.floor}` : 'Chưa đặt tầng'}</h3>
            {group.rooms.map(entry => <Link key={entry.id} href={view(item.id, entry.id)} className={room?.id === entry.id ? 'is-active' : ''}>
              <i className={entry.row?.published === 1 ? 'dot is-on' : 'dot'} aria-hidden="true" />{entry.name}<small>{entry.progress.done}/{entry.progress.total}</small></Link>)}
          </div>)}
        </div>;
      })}
      <p className="cx-legend"><i className="dot is-on" aria-hidden="true" /> đang hiển thị cho khách · <i className="dot" aria-hidden="true" /> đang ẩn · số nhỏ là mức hoàn thiện</p>
    </details></aside>

    <section className="cx-main">
      {query.saved === '1' && <p className="cx-flash" role="status">Đã lưu. {published ? '' : 'Mục này đang ẩn, tick "Hiển thị cho khách" khi sẵn sàng.'}</p>}
      {query.saved === 'hidden' && <p className="cx-flash" role="status">Đã gỡ khỏi website công khai.</p>}
      <div className="cx-head">
        <nav className="cx-crumbs" aria-label="Vị trí"><Link href={view(building.id)}>{building.name}</Link>{room && <><span aria-hidden="true">/</span>{roomInfo(room.id).floor ? <span>Tầng {roomInfo(room.id).floor}</span> : <span>Chưa đặt tầng</span>}<span aria-hidden="true">/</span><strong>{room.name}</strong></>}</nav>
        <h2>{target.name}</h2>
        <div className="cx-head-meta"><span className={published ? 'cx-pill is-on' : 'cx-pill'}>{published ? 'Đang hiển thị cho khách' : 'Đang ẩn'}</span><Meter progress={progress} /></div>
      </div>

      <div className="cx-panel">
        {tabs.map(item => <input key={item} type="radio" name="cx-tab" id={`cx-t-${item}`} defaultChecked={item === tab} />)}
        <div className="cx-tabbar" role="presentation">{tabs.map(item => <label key={item} htmlFor={`cx-t-${item}`}>{tabLabels[item]}{item === 'photos' ? ` (${photoCount(target.kind, target.id)})` : ''}</label>)}</div>

        <form className="cx-form" action="/api/admin/catalog" method="post">
          <input type="hidden" name="kind" value={target.kind} /><input type="hidden" name="sourceId" value={target.id} />
          {room ? <>
            <div className="cx-sec cx-sec-info">
              <label className="cx-publish"><input type="checkbox" name="published" defaultChecked={published} /><span><strong>Hiển thị phòng này cho khách</strong><small>Bỏ tick để ẩn khỏi website. Dữ liệu vẫn được giữ.</small></span></label>
              <CopyRoomDetails options={copySource.options.filter(option => option.id !== room.id)} />
              <Pair title="Giá và điều kiện thuê">
                <Field name="monthlyPrice" label="Giá theo tháng (VND)" value={roomRows.get(room.id)?.monthly_price} type="number" />
                <Field name="depositVnd" label="Tiền cọc (VND)" value={roomDetail.depositVnd} type="number" />
                <Field name="minStayMonths" label="Thuê tối thiểu (tháng)" value={roomDetail.minStayMonths} type="number" />
              </Pair>
              <Pair title="Loại phòng và vị trí">
                <Field name="typeVi" label="Loại phòng (VI)" value={roomDetail.typeVi} /><Field name="typeEn" label="Room type (EN)" value={roomDetail.typeEn} />
                <Field name="floor" label="Tầng" value={roomDetail.floor} hint={inferFloor(room.name) ? `Để trống thì tự lấy tầng ${inferFloor(room.name)} từ số phòng.` : 'Dùng để gom phòng theo tầng. Số phòng 3 chữ số (301) tự suy ra tầng.'} /><Field name="areaSqm" label="Diện tích (m²)" value={roomDetail.areaSqm} type="number" />
              </Pair>
              <Pair title="Sức chứa">
                <Field name="beds" label="Số giường" value={roomDetail.beds} type="number" /><Field name="bathrooms" label="Số WC" value={roomDetail.bathrooms} type="number" /><Field name="maxGuests" label="Sức chứa (người)" value={roomDetail.maxGuests} type="number" />
              </Pair>
            </div>
            <div className="cx-sec cx-sec-text">
              <Pair title="Mô tả"><Area name="descriptionVi" label="Mô tả phòng (VI)" value={roomDetail.descriptionVi} /><Area name="descriptionEn" label="Room description (EN)" value={roomDetail.descriptionEn} /></Pair>
              <Pair title="Nội thất, vật dụng"><Area name="furnitureVi" label="Nội thất (VI)" value={roomDetail.furnitureVi} lines /><Area name="furnitureEn" label="Furniture & equipment (EN)" value={roomDetail.furnitureEn} lines /></Pair>
              <Pair title="Tiện ích phòng"><Area name="amenitiesVi" label="Tiện ích (VI)" value={roomDetail.amenitiesVi} lines /><Area name="amenitiesEn" label="Room amenities (EN)" value={roomDetail.amenitiesEn} lines /></Pair>
              <Pair title="Phí dịch vụ"><Area name="serviceFeesVi" label="Phí dịch vụ (VI)" value={roomDetail.serviceFeesVi} /><Area name="serviceFeesEn" label="Service fees (EN)" value={roomDetail.serviceFeesEn} /></Pair>
              <Pair title="Quy định"><Area name="rulesVi" label="Quy định phòng (VI)" value={roomDetail.rulesVi} /><Area name="rulesEn" label="Room rules (EN)" value={roomDetail.rulesEn} /></Pair>
            </div>
          </> : <>
            <div className="cx-sec cx-sec-info">
              <label className="cx-publish"><input type="checkbox" name="published" defaultChecked={published} /><span><strong>Hiển thị tòa này cho khách</strong><small>Bỏ tick để ẩn khỏi website. Dữ liệu vẫn được giữ.</small></span></label>
              <Pair title="Địa chỉ"><Field name="address" label="Địa chỉ" value={buildingRow?.address} maxLength={300} hint="Toạ độ trên bản đồ nhập ở mục Vị trí & điểm đến." /></Pair>
              <Pair title="Loại tòa nhà và quy mô">
                <Field name="propertyTypeVi" label="Loại tòa nhà (VI)" value={buildingDetail.propertyTypeVi} /><Field name="propertyTypeEn" label="Building type (EN)" value={buildingDetail.propertyTypeEn} />
                <Field name="floorCount" label="Số tầng" value={buildingDetail.floorCount} type="number" /><Field name="areaSqm" label="Diện tích khuôn viên (m²)" value={buildingDetail.areaSqm} type="number" />
              </Pair>
            </div>
            <div className="cx-sec cx-sec-text">
              <Pair title="Giới thiệu"><Area name="descriptionVi" label="Giới thiệu tòa (VI)" value={buildingDetail.descriptionVi} /><Area name="descriptionEn" label="Building description (EN)" value={buildingDetail.descriptionEn} /></Pair>
              <Pair title="Tiện ích chung"><Area name="amenitiesVi" label="Tiện ích (VI)" value={buildingDetail.amenitiesVi} lines /><Area name="amenitiesEn" label="Building amenities (EN)" value={buildingDetail.amenitiesEn} lines /></Pair>
              <Pair title="Dịch vụ"><Area name="servicesVi" label="Dịch vụ (VI)" value={buildingDetail.servicesVi} lines /><Area name="servicesEn" label="Services (EN)" value={buildingDetail.servicesEn} lines /></Pair>
              <Pair title="Quy định tòa"><Area name="rulesVi" label="Quy định (VI)" value={buildingDetail.rulesVi} /><Area name="rulesEn" label="Building rules (EN)" value={buildingDetail.rulesEn} /></Pair>
            </div>
          </>}
          <div className="cx-savebar"><button type="submit">{room ? 'Lưu phòng' : 'Lưu tòa'}</button><small>Lưu cả hai tab Thông tin và Mô tả cùng lúc.</small></div>
        </form>

        <div className="cx-sec cx-sec-photos"><CatalogPhotos kind={target.kind} sourceId={target.id} images={gallery(target.kind, target.id)} /></div>

        {!room && <div className="cx-sec cx-sec-rooms">
          {floors.length === 0 && <p>Tòa này chưa có phòng trong Staydesk.</p>}
          {floors.map(group => <div key={group.floor || 'none'} className="cx-floor">
            <h3>{group.floor ? `Tầng ${group.floor}` : 'Chưa đặt tầng'}</h3>
            <ul>{group.rooms.map(entry => <li key={entry.id}>
              <Link href={view(building.id, entry.id)}><strong>{entry.name}</strong>
                <span>{entry.row?.monthly_price ? `${new Intl.NumberFormat('vi-VN').format(entry.row.monthly_price)} ₫` : 'Chưa có giá'}</span>
                <span>{photoCount('room', entry.id)} ảnh</span>
                <span className={entry.row?.published === 1 ? 'cx-pill is-on' : 'cx-pill'}>{entry.row?.published === 1 ? 'Hiển thị' : 'Ẩn'}</span>
                <Meter progress={entry.progress} /></Link>
            </li>)}</ul>
          </div>)}
        </div>}
      </div>
    </section>
    <script type="application/json" id="room-copy-data" dangerouslySetInnerHTML={{ __html: jsonLd(copySource.data) }} />
  </div></AdminShell>;
}
