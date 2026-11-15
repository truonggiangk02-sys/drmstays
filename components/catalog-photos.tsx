import { PhotoUploadEnhancer } from '@/components/photo-upload-enhancer';

export type CatalogImageRow = { id: string; owner_type: string; owner_id: string; alt: string; category: string };
type ImageRow = CatalogImageRow;

/** Photos, floor plans, the upload form and the "remove from website" button of one building or room. */
export function CatalogPhotos({ kind, sourceId, images, allowRemove = true, plans: showPlans = true }: { kind: 'building' | 'room' | 'roomtype' | 'home'; sourceId: string; images: ImageRow[]; allowRemove?: boolean; plans?: boolean }) {
  const photos = images.filter(item => item.category === 'photo');
  const plans = images.filter(item => item.category === 'floorplan');
  const renders = images.filter(item => item.category === 'render');
  const progress = images.filter(item => item.category === 'progress');
  // 3D renders and construction photos belong to buildings that are not open yet
  const groups = ([['photo', photos], ['render', renders], ['progress', progress], ['floorplan', plans]] as const)
    .filter(([category]) => category === 'photo' || (category === 'floorplan' ? showPlans : kind === 'building'));
  const titles = { photo: 'Photos', render: 'Ảnh 3D render (phối cảnh, minh họa)', progress: 'Ảnh đang hoàn thiện (tiến độ)', floorplan: 'Floor plans / layout images' } as const;
  return <div className="catalog-photos">
    {groups.map(([category, list]) => <div key={category}>
      <h4>{titles[category]}</h4>
      <div className="catalog-photo-grid">{list.map((image, index) => <div key={image.id} className="catalog-photo"><img src={`/media/catalog/${image.id}`} alt={image.alt || category} /><span>{category === 'photo' && index === 0 ? 'Cover' : category === 'floorplan' ? 'Floor plan' : category === 'render' ? `3D render ${index + 1}` : category === 'progress' ? `Tiến độ ${index + 1}` : `Photo ${index + 1}`}</span><div>{category === 'photo' && <form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="cover" /><button disabled={index === 0}>Set cover</button></form>}<form action="/api/admin/catalog-images" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="imageId" value={image.id} /><input type="hidden" name="action" value="delete" /><button>Delete</button></form></div></div>)}</div>
    </div>)}
    <form className="catalog-upload" action="/api/admin/catalog-images" method="post" encType="multipart/form-data"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} />{showPlans ? <label>Image type<select name="category" defaultValue="photo"><option value="photo">Property photo</option>{kind === 'building' && <><option value="render">3D render (ảnh phối cảnh, minh họa)</option><option value="progress">Ảnh đang hoàn thiện (tiến độ)</option></>}<option value="floorplan">Floor plan / layout</option></select></label> : <input type="hidden" name="category" value="photo" />}<label>JPG, PNG or WebP — pick several at once<input type="file" name="image" accept="image/jpeg,image/png,image/webp" multiple required /></label><label>Image description<input name="alt" maxLength={150} /></label><button>Upload image(s)</button><PhotoUploadEnhancer /></form>
    {allowRemove &&     <form className="catalog-remove" action="/api/admin/catalog" method="post"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="sourceId" value={sourceId} /><input type="hidden" name="action" value="remove" /><button>Remove from public website</button><small>The Staydesk record and saved public details remain available for republishing.</small></form>}
  </div>;
}
