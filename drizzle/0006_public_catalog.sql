CREATE TABLE IF NOT EXISTS catalog_buildings (
  source_id text PRIMARY KEY NOT NULL,
  published integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  services text NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS catalog_rooms (
  source_id text PRIMARY KEY NOT NULL,
  building_source_id text NOT NULL DEFAULT '',
  published integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  nightly_price integer NOT NULL DEFAULT 0,
  monthly_price integer NOT NULL DEFAULT 0,
  services text NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS catalog_images (
  id text PRIMARY KEY NOT NULL,
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  object_key text NOT NULL,
  mime text NOT NULL,
  alt text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_catalog_images_owner ON catalog_images (owner_type, owner_id, position);
CREATE TABLE IF NOT EXISTS catalog_inquiries (
  id text PRIMARY KEY NOT NULL,
  source_room_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  check_in text NOT NULL DEFAULT '',
  check_out text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catalog_inquiries_created ON catalog_inquiries (created_at DESC);
