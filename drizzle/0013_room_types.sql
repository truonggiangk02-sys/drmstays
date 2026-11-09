-- Room types ("chủng loại phòng"): photos, description and price live on the type, rooms point at one.
CREATE TABLE IF NOT EXISTS catalog_room_types (
  id text PRIMARY KEY NOT NULL,
  building_source_id text NOT NULL,
  name_vi text NOT NULL DEFAULT '',
  name_en text NOT NULL DEFAULT '',
  published integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  monthly_price integer NOT NULL DEFAULT 0,
  details_json text NOT NULL DEFAULT '{}',
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_room_types_building ON catalog_room_types (building_source_id, position);
ALTER TABLE catalog_rooms ADD COLUMN type_id text;
ALTER TABLE catalog_inquiries ADD COLUMN source_type_id text NOT NULL DEFAULT '';
