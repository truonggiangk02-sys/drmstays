import { env } from 'cloudflare:workers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { isAdmin } from '@/lib/admin';
import { getStaydeskCatalog } from '@/lib/staydesk-catalog';

export const dynamic = 'force-dynamic';

type BuildingRow = {
  source_id: string;
  published: number;
  description: string;
  address: string;
  services: string;
};
type RoomRow = {
  source_id: string;
  published: number;
  description: string;
  nightly_price: number;
  monthly_price: number;
  services: string;
};
type ImageRow = { id: string; owner_type: string; owner_id: string; alt: string };

function serviceLines(value?: string) {
  if (!value) return '';
  try {
    const items: unknown = JSON.parse(value);
    return Array.isArray(items) ? items.join('\n') : '';
  } catch {
    return '';
  }
}

function Photos({
  kind,
  sourceId,
  images,
}: {
  kind: 'building' | 'room';
  sourceId: string;
  images: ImageRow[];
}) {
  return (
    <div className="catalog-photos">
      <div className="catalog-photo-grid">
        {images.map((image, index) => (
          <div key={image.id} className="catalog-photo">
            <img src={`/api/catalog-images/${image.id}`} alt={image.alt || 'Property photo'} />
            <span>{index === 0 ? 'Cover' : `Photo ${index + 1}`}</span>
            <div>
              {['cover', 'delete'].map((action) => (
                <form key={action} action="/api/admin/catalog-images" method="post">
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="sourceId" value={sourceId} />
                  <input type="hidden" name="imageId" value={image.id} />
                  <input type="hidden" name="action" value={action} />
                  <button disabled={action === 'cover' && index === 0}>
                    {action === 'cover' ? 'Set cover' : 'Delete'}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
      <form
        className="catalog-upload"
        action="/api/admin/catalog-images"
        method="post"
        encType="multipart/form-data"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="sourceId" value={sourceId} />
        <label>
          Photo
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <label>
          Description
          <input name="alt" maxLength={150} />
        </label>
        <button>Upload photo</button>
      </form>
    </div>
  );
}

export default async function CatalogAdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!env.DB)
    return (
      <AdminShell title="Public catalog">
        <p>Database unavailable.</p>
      </AdminShell>
    );
  let source;
  try {
    source = await getStaydeskCatalog();
  } catch {
    return (
      <AdminShell title="Public catalog">
        <p>
          Cannot connect to Staydesk. Configure STAYDESK_CATALOG_SECRET on this Site and
          PUBLIC_CATALOG_SECRET on Staydesk with the same value.
        </p>
      </AdminShell>
    );
  }
  const [buildingRows, roomRows, imageRows] = await Promise.all([
    env.DB.prepare(
      'SELECT source_id, published, description, address, services FROM catalog_buildings',
    ).all<BuildingRow>(),
    env.DB.prepare(
      'SELECT source_id, published, description, nightly_price, monthly_price, services FROM catalog_rooms',
    ).all<RoomRow>(),
    env.DB.prepare(
      'SELECT id, owner_type, owner_id, alt FROM catalog_images ORDER BY position, id',
    ).all<ImageRow>(),
  ]);
  const buildings = new Map((buildingRows.results || []).map((row) => [row.source_id, row]));
  const rooms = new Map((roomRows.results || []).map((row) => [row.source_id, row]));
  const photos = (kind: string, id: string) =>
    (imageRows.results || []).filter((image) => image.owner_type === kind && image.owner_id === id);
  return (
    <AdminShell title="Public catalog">
      <p className="admin-hint">
        Choose what guests can see. Names and availability come from Staydesk; descriptions, rates,
        services and photos are managed here.
      </p>
      {source.buildings.map((building) => {
        const profile = buildings.get(building.id);
        return (
          <section className="catalog-admin-building" id={`item-${building.id}`} key={building.id}>
            <h2>{building.name}</h2>
            <form className="catalog-editor" action="/api/admin/catalog" method="post">
              <input type="hidden" name="kind" value="building" />
              <input type="hidden" name="sourceId" value={building.id} />
              <label className="catalog-check">
                <input type="checkbox" name="published" defaultChecked={profile?.published === 1} />
                Show this building to guests
              </label>
              <label>
                Address
                <input name="address" defaultValue={profile?.address || ''} maxLength={300} />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  defaultValue={profile?.description || ''}
                  rows={4}
                  maxLength={3000}
                />
              </label>
              <label>
                Services, one per line
                <textarea name="services" defaultValue={serviceLines(profile?.services)} rows={3} />
              </label>
              <button>Save building</button>
            </form>
            <Photos
              kind="building"
              sourceId={building.id}
              images={photos('building', building.id)}
            />
            <div className="catalog-admin-rooms">
              {building.rooms.map((room) => {
                const detail = rooms.get(room.id);
                return (
                  <article id={`item-${room.id}`} key={room.id}>
                    <h3>{room.name}</h3>
                    <form className="catalog-editor" action="/api/admin/catalog" method="post">
                      <input type="hidden" name="kind" value="room" />
                      <input type="hidden" name="sourceId" value={room.id} />
                      <label className="catalog-check">
                        <input
                          type="checkbox"
                          name="published"
                          defaultChecked={detail?.published === 1}
                        />
                        Show this room to guests
                      </label>
                      <label>
                        Nightly price (VND)
                        <input
                          type="number"
                          name="nightlyPrice"
                          min="0"
                          defaultValue={detail?.nightly_price || 0}
                        />
                      </label>
                      <label>
                        Monthly price (VND)
                        <input
                          type="number"
                          name="monthlyPrice"
                          min="0"
                          defaultValue={detail?.monthly_price || 0}
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          name="description"
                          defaultValue={detail?.description || ''}
                          rows={3}
                          maxLength={3000}
                        />
                      </label>
                      <label>
                        Services, one per line
                        <textarea
                          name="services"
                          defaultValue={serviceLines(detail?.services)}
                          rows={3}
                        />
                      </label>
                      <button>Save room</button>
                    </form>
                    <Photos kind="room" sourceId={room.id} images={photos('room', room.id)} />
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </AdminShell>
  );
}
