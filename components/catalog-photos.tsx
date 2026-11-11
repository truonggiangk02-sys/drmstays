import { PhotoUploadEnhancer } from '@/components/photo-upload-enhancer';

export type CatalogImageRow = { id: string; owner_type: string; owner_id: string; alt: string; category: string };
type ImageRow = CatalogImageRow;

/** Photos, floor plans, the upload form and the "remove from website" button of one building or room. */
export function CatalogPhotos({ kind, sourceId, images, allowRemove = true, plans: showPlans = true }: { kind: 'building' | 'room' | 'roomtype' | 'home'; sourceId: string; images: ImageRow[]; allowRemove?: boolean; plans?: boolean }) {
  const photos = images.filter(item => item.category === 'photo');
  const plans = images.filter(item => item.category === 'floorplan');
  return <div className="catalog-photos">
    {([['photo', photos], ['floorplan', plans]] as const).filter(([category]) => showPlans || category === 'photo').map(([category, list]) => <div key={category}>
      <h4>{category === 'photo' ? 'Photos' : 'Floor plans / layout images'}</h4>
      <div className="catalog-photo-grid">{list.map((image, index) => <div key={image.id} className="catalog-photo"><img src={`/media/catalog/${image.id}`} alt={image.alt || category} /><span>{category === 'photo' && index === 0 ? 'Cover' : category === 'floorplan' ? 'Floor plan' : `Photo ${index + 1}`}</span><div>{category === 'photo' && <form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="cover" /><button disabled={index === 0}>Set cover</button></form>}<form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="delete" /><button>Delete</button></form></div></div>)}</div>
    </div>)}
    <form className="catalog-upload" action="/api/admin/catalog-images" method="post" encType="multipart/form-data"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} />{showPlans ? <label>Image type<select name="category" defaultValue="photo"><option value="photo">Property photo</option><option value="floorplan">Floor plan / layout</option></select></label> : <input type="hidden" name="category" value="photo" />}<label>JPG, PNG or WebP — pick several at once<input type="file" name="image" accept="image/jpeg,image/png,image/webp" multiple required /></label><label>Image description<input name="alt" maxLength={150} /></label><button>Upload image(s)</button><PhotoUploadEnhancer /></form>
    {allowRemove &&     <form className="catalog-remove" action="/api/admin/catalog" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="action" value="remove" /><button>Remove from public website</button><small>The Staydesk record and saved public details remain available for republishing.</small></form>}
  </div>;
}
