export type RoomKind = 'studio' | 'oneBed' | 'twoBed' | 'other';

/** Rough room style taken from the name of a room or room type ("Studio with desk", "Căn hộ 1 PN"), used by the filters. */
export function kindOf(name: string): RoomKind {
  if (/studio/i.test(name)) return 'studio';
  const bedrooms = /(\d)[\s-]*(pn|phòng ngủ|bedroom|br)(?!\p{L})/iu.exec(name);
  if (bedrooms) return bedrooms[1] === '1' ? 'oneBed' : bedrooms[1] === '2' ? 'twoBed' : 'other';
  return 'other';
}
