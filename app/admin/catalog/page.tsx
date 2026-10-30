import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { getStaydeskCatalog } from '@/lib/staydesk-catalog';
import { parseDetails, type BuildingDetails, type RoomDetails } from '@/lib/catalog-details';
import { CopyRoomDetails } from '@/components/copy-room-details';
import { buildCopySource } from '@/lib/room-copy';
import { jsonLd } from '@/lib/site';

export const dynamic = 'force-dynamic';

type BuildingRow = { source_id: string; published: number; address: string; details_json: string };
type RoomRow = { source_id: string; published: number; monthly_price: number; details_json: string };
type ImageRow = { id: string; owner_type: string; owner_id: string; alt: string; category: string };

function Field({ name, label, value, type = 'text', maxLength }: { name: string; label: string; value?: string | number; type?: string; maxLength?: number }) {
  return <label>{label}<input name={name} type={type} min={type === 'number' ? 0 : undefined} defaultValue={value || ''} maxLength={maxLength} /></label>;
}
function TextArea({ name, label, value, rows = 3 }: { name: string; label: string; value?: string; rows?: number }) {
  return <label>{label}<textarea name={name} defaultValue={value || ''} rows={rows} /></label>;
}
function Lines({ name, label, value }: { name: string; label: string; value?: string[] }) {
  return <TextArea name={name} label={`${label} — one per line`} value={value?.join('\n')} />;
}
function Photos({ kind, sourceId, images }: { kind: 'building' | 'room'; sourceId: string; images: ImageRow[] }) {
  const photos = images.filter(item => item.category === 'photo');
  const plans = images.filter(item => item.category === 'floorplan');
  return <div className="catalog-photos">
    {([['photo', photos], ['floorplan', plans]] as const).map(([category, list]) => <div key={category}>
      <h4>{category === 'photo' ? 'Photos' : 'Floor plans / layout images'}</h4>
      <div className="catalog-photo-grid">{list.map((image, index) => <div key={image.id} className="catalog-photo"><img src={`/api/catalog-images/${image.id}`} alt={image.alt || category} /><span>{category === 'photo' && index === 0 ? 'Cover' : category === 'floorplan' ? 'Floor plan' : `Photo ${index + 1}`}</span><div>{category === 'photo' && <form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="cover" /><button disabled={index === 0}>Set cover</button></form>}<form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="delete" /><button>Delete</button></form></div></div>)}</div>
    </div>)}
    <form className="catalog-upload" action="/api/admin/catalog-images" method="post" encType="multipart/form-data"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><label>Image type<select name="category" defaultValue="photo"><option value="photo">Property photo</option><option value="floorplan">Floor plan / layout</option></select></label><label>JPG, PNG or WebP (max 5 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label><Field name="alt" label="Image description" maxLength={150} /><button>Upload image</button></form>
    <form className="catalog-remove" action="/api/admin/catalog" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="action" value="remove" /><button>Remove from public website</button><small>The Staydesk record and saved public details remain available for republishing.</small></form>
  </div>;
}

export default async function CatalogAdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB) return <AdminShell title="Property catalog"><p>Database unavailable.</p></AdminShell>;
  let source;
  try { source = await getStaydeskCatalog(); }
  catch { return <AdminShell title="Property catalog"><p>Staydesk is unavailable. Configure the private catalog connection first.</p></AdminShell>; }
  const [buildingsResult, roomsResult, imagesResult] = await Promise.all([
    env.DB.prepare('SELECT source_id, published, address, details_json FROM catalog_buildings').all<BuildingRow>(),
    env.DB.prepare('SELECT source_id, published, monthly_price, details_json FROM catalog_rooms').all<RoomRow>(),
    env.DB.prepare('SELECT id, owner_type, owner_id, alt, category FROM catalog_images ORDER BY position, id').all<ImageRow>(),
  ]);
  const buildings = new Map((buildingsResult.results || []).map(row => [row.source_id, row]));
  const rooms = new Map((roomsResult.results || []).map(row => [row.source_id, row]));
  const copySource = buildCopySource(source.buildings, rooms);
  const gallery = (kind: string, id: string) => (imagesResult.results || []).filter(image => image.owner_type === kind && image.owner_id === id);
  return <AdminShell title="Property catalog"><p className="admin-hint">Staydesk supplies only building/room IDs, names and availability. Enter all public details here in both languages. Save each building and room separately. Uncheck “Show to guests” to hide an item. Many similar rooms? Use “Copy details from another room” inside a room, review, then Save.</p>
    <script type="application/json" id="room-copy-data" dangerouslySetInnerHTML={{ __html: jsonLd(copySource.data) }} />
    {source.buildings.map(building => {
      const row = buildings.get(building.id), detail = parseDetails<BuildingDetails>(row?.details_json);
      return <section className="catalog-admin-building" id={`item-${building.id}`} key={building.id}><h2>{building.name}</h2><form className="catalog-editor rich-catalog-editor" action="/api/admin/catalog" method="post"><input type="hidden" name="kind" value="building" /><input type="hidden" name="sourceId" value={building.id} /><label className="catalog-check"><input type="checkbox" name="published" defaultChecked={row?.published === 1} /> Show this building to guests</label><Field name="address" label="Address / Địa chỉ" value={row?.address} maxLength={300} /><div className="rich-catalog-pair"><Field name="propertyTypeVi" label="Loại tòa nhà (VI)" value={detail.propertyTypeVi} /><Field name="propertyTypeEn" label="Building type (EN)" value={detail.propertyTypeEn} /></div><div className="rich-catalog-pair"><Field name="areaSqm" label="Diện tích khuôn viên (m²)" value={detail.areaSqm} type="number" /><Field name="floorCount" label="Số tầng" value={detail.floorCount} type="number" /></div><div className="rich-catalog-pair"><TextArea name="descriptionVi" label="Giới thiệu tòa (VI)" value={detail.descriptionVi} /><TextArea name="descriptionEn" label="Building description (EN)" value={detail.descriptionEn} /></div><div className="rich-catalog-pair"><Lines name="amenitiesVi" label="Tiện ích chung (VI)" value={detail.amenitiesVi} /><Lines name="amenitiesEn" label="Building amenities (EN)" value={detail.amenitiesEn} /></div><div className="rich-catalog-pair"><Lines name="servicesVi" label="Dịch vụ (VI)" value={detail.servicesVi} /><Lines name="servicesEn" label="Services (EN)" value={detail.servicesEn} /></div><div className="rich-catalog-pair"><TextArea name="rulesVi" label="Quy định tòa (VI)" value={detail.rulesVi} /><TextArea name="rulesEn" label="Building rules (EN)" value={detail.rulesEn} /></div><button>Save building</button></form><Photos kind="building" sourceId={building.id} images={gallery('building', building.id)} />
        <div className="catalog-admin-rooms">{building.rooms.map(room => {
          const row = rooms.get(room.id), detail = parseDetails<RoomDetails>(row?.details_json);
          return <article id={`item-${room.id}`} key={room.id}><h3>{room.name}</h3><form className="catalog-editor rich-catalog-editor" action="/api/admin/catalog" method="post"><input type="hidden" name="kind" value="room" /><input type="hidden" name="sourceId" value={room.id} /><label className="catalog-check"><input type="checkbox" name="published" defaultChecked={row?.published === 1} /> Show this room to guests</label><CopyRoomDetails options={copySource.options.filter(option => option.id !== room.id)} /><Field name="monthlyPrice" label="Giá theo tháng (VND)" value={row?.monthly_price} type="number" /><div className="rich-catalog-pair"><Field name="typeVi" label="Loại phòng (VI)" value={detail.typeVi} /><Field name="typeEn" label="Room type (EN)" value={detail.typeEn} /></div><div className="rich-catalog-pair"><Field name="floor" label="Tầng / mã tầng" value={detail.floor} /><Field name="areaSqm" label="Diện tích phòng (m²)" value={detail.areaSqm} type="number" /></div><div className="rich-catalog-triple"><Field name="beds" label="Số giường" value={detail.beds} type="number" /><Field name="bathrooms" label="Số WC" value={detail.bathrooms} type="number" /><Field name="maxGuests" label="Sức chứa (người)" value={detail.maxGuests} type="number" /></div><div className="rich-catalog-pair"><Field name="depositVnd" label="Tiền cọc (VND)" value={detail.depositVnd} type="number" /><Field name="minStayMonths" label="Thời hạn thuê tối thiểu (tháng)" value={detail.minStayMonths} type="number" /></div><div className="rich-catalog-pair"><TextArea name="descriptionVi" label="Mô tả phòng (VI)" value={detail.descriptionVi} /><TextArea name="descriptionEn" label="Room description (EN)" value={detail.descriptionEn} /></div><div className="rich-catalog-pair"><Lines name="furnitureVi" label="Nội thất, vật dụng (VI)" value={detail.furnitureVi} /><Lines name="furnitureEn" label="Furniture & equipment (EN)" value={detail.furnitureEn} /></div><div className="rich-catalog-pair"><Lines name="amenitiesVi" label="Tiện ích phòng (VI)" value={detail.amenitiesVi} /><Lines name="amenitiesEn" label="Room amenities (EN)" value={detail.amenitiesEn} /></div><div className="rich-catalog-pair"><TextArea name="serviceFeesVi" label="Phí dịch vụ (VI)" value={detail.serviceFeesVi} /><TextArea name="serviceFeesEn" label="Service fees (EN)" value={detail.serviceFeesEn} /></div><div className="rich-catalog-pair"><TextArea name="rulesVi" label="Quy định phòng (VI)" value={detail.rulesVi} /><TextArea name="rulesEn" label="Room rules (EN)" value={detail.rulesEn} /></div><button>Save room</button></form><Photos kind="room" sourceId={room.id} images={gallery('room', room.id)} /></article>;
        })}</div>
      </section>;
    })}
  </AdminShell>;
}
