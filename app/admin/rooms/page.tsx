import { getApartments } from "@/lib/data";
import { AdminShell } from "@/components/admin-shell";
import { RoomFields } from "@/components/room-fields";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  if (!await isAdmin()) redirect("/admin/login");
  const rooms = await getApartments();
  return <AdminShell title="Rooms & rates">
    <p className="admin-hint">Manage room details, prices, availability and photos. Changes appear on the public catalog after saving.</p>
    <details className="cms-add-room">
      <summary>+ Add New Room</summary>
      <form action="/api/admin/rooms" method="post" encType="multipart/form-data">
        <RoomFields/>
        <label>Cover photo (optional)<input type="file" name="image" accept="image/jpeg,image/png,image/webp"/><small>JPG, PNG or WebP, up to 900 KB. Add more photos after creating the room.</small></label>
        <label>Photo description<input name="imageAlt" maxLength={120} placeholder="Bright apartment interior"/></label>
        <button type="submit">Create room</button>
      </form>
    </details>
    <div className="admin-list cms-room-list">{rooms.map(room => <section id={`room-${room.id}`} key={room.id} className="cms-room">
      <div className="cms-room-heading"><img src={room.image} alt={room.imageDescription}/><div><span className="eyebrow">{room.building}</span><h2>{room.name}</h2><span className={room.active ? "live" : "hidden-status"}>{room.active ? "Live" : "Hidden"}</span><p>{room.availableUnits ?? 0} currently available</p></div></div>
      <details><summary aria-label={`Edit ${room.name}`}>Edit <span>Open editor</span></summary><form action="/api/admin/listings" method="post"><input type="hidden" name="id" value={room.id}/><RoomFields room={room}/><button type="submit">Save room changes</button></form></details>
      <div className="cms-gallery"><h3>Photo gallery</h3><p>JPG, PNG or WebP, up to 900 KB each. The first image is the cover.</p><div className="cms-photos">{room.images.map((image, index) => <div key={image.id} className="cms-photo"><img src={image.url} alt={image.alt}/><span>{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</span><div>{["cover", "up", "down", "delete"].map(action => <form key={action} action="/api/admin/images" method="post"><input type="hidden" name="roomId" value={room.id}/><input type="hidden" name="imageId" value={image.id}/><input type="hidden" name="action" value={action}/><button type="submit" disabled={(action === "up" && index === 0) || (action === "down" && index === room.images.length - 1) || (action === "cover" && index === 0)}>{action === "cover" ? "Set cover" : action === "up" ? "↑" : action === "down" ? "↓" : "Delete"}</button></form>)}</div></div>)}</div><form className="cms-upload" action="/api/admin/images" method="post" encType="multipart/form-data"><input type="hidden" name="roomId" value={room.id}/><input type="hidden" name="action" value="upload"/><label>Upload image<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required/></label><label>Image description<input name="alt" maxLength={120} placeholder="Bright living room with ocean view"/></label><button type="submit">Upload photo</button></form></div>
    </section>)}</div>
  </AdminShell>;
}
