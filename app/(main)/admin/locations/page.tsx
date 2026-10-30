import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { parseDetails, type BuildingDetails } from '@/lib/catalog-details';
import { getFreshStaydeskCatalog, getStaydeskCatalog, demoBuildingIds } from '@/lib/staydesk-catalog';
import { parseBuildingIds, type LandmarkRow } from '@/lib/landmarks';

export const dynamic = 'force-dynamic';

type BuildingRow = { source_id: string; address: string; details_json: string };
type SourceBuilding = Awaited<ReturnType<typeof getStaydeskCatalog>>['buildings'][number];

const previewAddresses = new Map([
  [demoBuildingIds[0], '70 Mai Thúc Lân, Ngũ Hành Sơn, Đà Nẵng'],
  [demoBuildingIds[1], "K234/29-31 Đỗ Bá, Ngũ Hành Sơn, Đà Nẵng"],
]);

function BuildingLocation({ building, row }: { building: SourceBuilding; row?: BuildingRow }) {
  const detail = parseDetails<BuildingDetails>(row?.details_json);
  const hasCoordinates = typeof detail.latitude === 'number' && typeof detail.longitude === 'number';
  return <article className="location-building" id={`building-${building.id}`}>
    <div className="location-building-heading"><div><h3>{building.name}</h3><small>{row?.address || previewAddresses.get(building.id) || 'Chưa có địa chỉ'}</small></div><span className={`location-status ${hasCoordinates && !detail.coordinateApproximate ? 'is-confirmed' : ''}`}>{hasCoordinates && !detail.coordinateApproximate ? 'Đã xác nhận vị trí' : 'Vị trí tham khảo'}</span></div>
    <form action="/api/admin/locations" method="post" className="location-form">
      <input type="hidden" name="kind" value="building" /><input type="hidden" name="action" value="save" /><input type="hidden" name="sourceId" value={building.id} />
      <label className="location-wide">Địa chỉ đầy đủ<input name="address" defaultValue={row?.address || previewAddresses.get(building.id) || ''} maxLength={300} required /></label>
      <div className="location-coordinates"><label>Vĩ độ<input type="number" name="latitude" min="-90" max="90" step="any" defaultValue={detail.latitude ?? ''} placeholder="16.048…" /></label><label>Kinh độ<input type="number" name="longitude" min="-180" max="180" step="any" defaultValue={detail.longitude ?? ''} placeholder="108.243…" /></label></div>
      <label className="location-check"><input type="checkbox" name="coordinateApproximate" defaultChecked={detail.coordinateApproximate !== false} /> Vị trí ghim chỉ mang tính tham khảo</label>
      <p className="location-help">Ghim mẫu chỉ thể hiện khu vực. Chỉ bỏ dấu “tham khảo” sau khi đã đối chiếu đúng cửa tòa; khi đó website mới có thể hiển thị thời gian tuyến đường.</p>
      <button type="submit">Lưu vị trí tòa</button>
    </form>
  </article>;
}

function LandmarkForm({ row, buildings }: { row?: LandmarkRow; buildings: SourceBuilding[] }) {
  const isNew = !row;
  const assigned = row ? parseBuildingIds(row.building_ids_json) : [];
  return <form action="/api/admin/locations" method="post" className="location-form">
    <input type="hidden" name="kind" value="landmark" /><input type="hidden" name="action" value={isNew ? 'create' : 'save'} />{row && <input type="hidden" name="id" value={row.id} />}
    <div className="location-coordinates"><label>Tên tiếng Việt<input name="nameVi" defaultValue={row?.name_vi} maxLength={160} required /></label><label>Tên tiếng Anh<input name="nameEn" defaultValue={row?.name_en} maxLength={160} /></label></div>
    <div className="location-coordinates"><label>Vĩ độ<input type="number" name="latitude" min="-90" max="90" step="any" defaultValue={row?.latitude ?? ''} required /></label><label>Kinh độ<input type="number" name="longitude" min="-180" max="180" step="any" defaultValue={row?.longitude ?? ''} required /></label></div>
    <div className="location-coordinates"><label>Mô tả tiếng Việt<textarea name="descriptionVi" defaultValue={row?.description_vi} rows={3} maxLength={500} /></label><label>Mô tả tiếng Anh<textarea name="descriptionEn" defaultValue={row?.description_en} rows={3} maxLength={500} /></label></div>
    <fieldset className="location-buildings"><legend>Hiện cho tòa nào?</legend><p>Không chọn tòa nào = hiện cho tất cả tòa.</p><div>{buildings.map(building => <label key={building.id}><input type="checkbox" name="buildingId" value={building.id} defaultChecked={assigned.includes(building.id)} />{building.name}</label>)}</div></fieldset>
    <div className="location-options"><label>Thứ tự hiển thị<input type="number" name="position" min="0" max="1000" defaultValue={row?.position ?? 0} /></label><label className="location-check"><input type="checkbox" name="published" defaultChecked={isNew || row?.published === 1} /> Hiển thị trên website</label></div>
    <button type="submit">{isNew ? 'Thêm địa điểm' : 'Lưu địa điểm'}</button>
  </form>;
}

export default async function LocationsAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB) return <AdminShell title="Vị trí & điểm đến"><p>Chưa kết nối được cơ sở dữ liệu.</p></AdminShell>;
  let buildings: SourceBuilding[] = [];
  try { buildings = (await getFreshStaydeskCatalog()).buildings; } catch { /* Landmarks remain editable when Staydesk is temporarily unavailable. */ }
  const [buildingResult, landmarkResult] = await Promise.all([
    env.DB.prepare('SELECT source_id, address, details_json FROM catalog_buildings').all<BuildingRow>(),
    env.DB.prepare('SELECT id, name_vi, name_en, description_vi, description_en, latitude, longitude, building_ids_json, published, deleted, position FROM landmarks ORDER BY position, id').all<LandmarkRow>(),
  ]);
  const rows = new Map((buildingResult.results || []).map(row => [row.source_id, row]));
  const landmarks = landmarkResult.results || [];
  const active = landmarks.filter(row => row.deleted !== 1);
  const deleted = landmarks.filter(row => row.deleted === 1);
  return <AdminShell title="Vị trí & điểm đến">
    <p className="admin-hint">Quản lý ghim tòa và các địa điểm xuất hiện trên bản đồ khách. Vị trí mẫu chỉ là tham khảo; cần xác nhận đúng cửa tòa trước khi hiển thị như vị trí chính xác.</p>
    <div className="location-topbar"><div><strong>{buildings.length}</strong><span>tòa nhà</span></div><div><strong>{active.filter(row => row.published === 1).length}</strong><span>địa điểm đang hiện</span></div><div><strong>{active.filter(row => row.published !== 1).length}</strong><span>địa điểm đang ẩn</span></div><Link href="/vi/stays" target="_blank" rel="noopener noreferrer">Xem bản đồ khách ↗</Link></div>
    <section className="location-section"><div className="location-section-heading"><div><h2>Vị trí tòa nhà</h2><p>Kiểm tra địa chỉ và tọa độ từng tòa. Ghim chưa xác nhận luôn được ghi rõ là tham khảo.</p></div><span>{buildings.length} tòa</span></div>{buildings.length ? buildings.map(building => <BuildingLocation key={building.id} building={building} row={rows.get(building.id)} />) : <p>Chưa lấy được danh sách tòa từ Staydesk.</p>}</section>
    <section className="location-section" id="landmark-list"><div className="location-section-heading"><div><h2>Địa điểm nổi tiếng</h2><p>Thêm, sửa hoặc ẩn địa điểm. Bỏ chọn “Hiển thị trên website” rồi lưu để ẩn ghim.</p></div><span>{active.length} mục</span></div><details className="location-add"><summary>+ Thêm địa điểm mới</summary><LandmarkForm buildings={buildings} /></details>
      <div className="location-list">{active.map(row => <details key={row.id} id={`landmark-${row.id}`} className="location-item"><summary><span>{row.name_vi}<small>{row.name_en && row.name_en !== row.name_vi ? row.name_en : `${row.latitude?.toFixed(5) ?? '—'}, ${row.longitude?.toFixed(5) ?? '—'}`}</small></span><span className="location-item-meta"><em className={row.published === 1 ? 'is-published' : ''}>{row.published === 1 ? 'Đang hiện' : 'Đang ẩn'}</em><small>{parseBuildingIds(row.building_ids_json).length || 'Tất cả'} tòa</small></span></summary><LandmarkForm row={row} buildings={buildings} /><details className="location-delete"><summary>Xóa địa điểm…</summary><p>Địa điểm sẽ biến mất khỏi bản đồ và có thể khôi phục bên dưới.</p><form action="/api/admin/locations" method="post"><input type="hidden" name="kind" value="landmark" /><input type="hidden" name="action" value="delete" /><input type="hidden" name="id" value={row.id} /><button type="submit">Xác nhận xóa</button></form></details></details>)}</div>
      {deleted.length > 0 && <details className="location-deleted"><summary>Địa điểm đã xóa ({deleted.length})</summary>{deleted.map(row => <form action="/api/admin/locations" method="post" key={row.id}><input type="hidden" name="kind" value="landmark" /><input type="hidden" name="action" value="restore" /><input type="hidden" name="id" value={row.id} /><span>{row.name_vi}</span><button type="submit">Khôi phục</button></form>)}</details>}
    </section>
  </AdminShell>;
}
