export type RoomInput = {
  name: string; building: string; address: string; area: string; view: string;
  description: string; price: number; monthlyPrice: number; usdNightly: number;
  usdMonthly: number; guests: number; sqm: number; beds: string; wifi: string;
  amenities: string[]; availableUnits: number; active: number;
};

export function parseRoomInput(form: FormData): RoomInput | null {
  const value = (key: string) => String(form.get(key) || "").trim();
  const buildingChoice = value("building");
  if (!["AnLiu Apartment", "Doraemonland", "custom"].includes(buildingChoice)) return null;
  const building = buildingChoice === "custom" ? value("customBuilding") : buildingChoice;
  const room: RoomInput = {
    name: value("name"), building, address: value("address"), area: value("area"),
    view: value("view"), description: value("description"), price: Number(value("price")),
    monthlyPrice: Number(value("monthlyPrice")), usdNightly: Number(value("usdNightly")),
    usdMonthly: Number(value("usdMonthly")), guests: Number(value("guests")),
    sqm: Number(value("sqm")), beds: value("beds"), wifi: value("wifi"),
    amenities: value("amenities").split(/\r?\n|,/).map(item => item.trim()).filter(Boolean),
    availableUnits: value("availableUnits") === "" ? 0 : Number(value("availableUnits")),
    active: form.get("active") === "on" ? 1 : 0,
  };
  const validInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!room.name || room.name.length > 100 || !room.building || room.building.length > 100 || !room.address || room.address.length > 150 || !room.area || room.area.length > 100 || !room.view || room.view.length > 120 || !room.description || room.description.length > 1500 || !room.beds || room.beds.length > 100 || !room.wifi || room.wifi.length > 100 || room.amenities.length > 30 || room.amenities.some(item => item.length > 100) || !validInt(room.price, 100000, 100000000) || !validInt(room.monthlyPrice, 1000000, 1000000000) || !validInt(room.usdNightly, 1, 10000) || !validInt(room.usdMonthly, 1, 100000) || !validInt(room.guests, 1, 20) || !validInt(room.sqm, 1, 1000) || !validInt(room.availableUnits, 0, 1000)) return null;
  return room;
}
