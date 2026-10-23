import type { Apartment } from "@/lib/apartments";

export function RoomFields({ room }: { room?: Apartment }) {
  const known = ["AnLiu Apartment", "Doraemonland"];
  return <>
    <label>Room name<input required name="name" maxLength={100} defaultValue={room?.name}/></label>
    <label>Building<select name="building" defaultValue={!room ? "AnLiu Apartment" : known.includes(room.building) ? room.building : "custom"}><option value="AnLiu Apartment">AnLiu Apartment</option><option value="Doraemonland">Doraemonland</option><option value="custom">Custom building</option></select></label>
    <label>Custom building name<input name="customBuilding" maxLength={100} defaultValue={room && !known.includes(room.building) ? room.building : ""} placeholder="Only if Custom is selected"/></label>
    <label>Address<input required name="address" maxLength={150} defaultValue={room?.address} placeholder="Street, Da Nang"/></label>
    <label>Area / neighbourhood<input required name="area" maxLength={100} defaultValue={room?.area} placeholder="My Khe Beach"/></label>
    <label>View<input required name="view" maxLength={120} defaultValue={room?.view} placeholder="Courtyard view"/></label>
    <label className="cms-wide">Description<textarea required name="description" maxLength={1500} rows={4} defaultValue={room?.description}/></label>
    <label>Nightly rate (VND)<input required name="price" type="number" min="100000" max="100000000" defaultValue={room?.price}/></label>
    <label>Nightly rate (USD)<input required name="usdNightly" type="number" min="1" max="10000" defaultValue={room?.usdNightly}/></label>
    <label>Monthly rate (VND)<input required name="monthlyPrice" type="number" min="1000000" max="1000000000" defaultValue={room?.monthlyPrice}/></label>
    <label>Monthly rate (USD)<input required name="usdMonthly" type="number" min="1" max="100000" defaultValue={room?.usdMonthly}/></label>
    <label>Capacity (guests)<input required name="guests" type="number" min="1" max="20" defaultValue={room?.guests ?? 2}/></label>
    <label>Area (sqm)<input required name="sqm" type="number" min="1" max="1000" defaultValue={room?.sqm}/></label>
    <label>Bed type<input required name="beds" maxLength={100} defaultValue={room?.beds} placeholder="1 Queen bed"/></label>
    <label>Wi-Fi speed<input required name="wifi" maxLength={100} defaultValue={room?.wifi} placeholder="150 Mbps"/></label>
    <label className="cms-wide">Amenities (one per line)<textarea name="amenities" rows={6} defaultValue={room?.amenities.join("\n")}/></label>
    <label className="cms-wide">Available units left<input name="availableUnits" type="number" min="0" max="1000" defaultValue={room?.availableUnits ?? undefined}/><small>Set how many units are currently vacant. Leave empty or set to 0 if fully booked.</small></label>
    <label className="checkbox cms-wide"><input type="checkbox" name="active" defaultChecked={room?.active ?? true}/> Show room in public catalog</label>
  </>;
}
