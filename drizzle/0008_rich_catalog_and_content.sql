ALTER TABLE catalog_buildings ADD COLUMN details_json text NOT NULL DEFAULT '{}';
ALTER TABLE catalog_rooms ADD COLUMN details_json text NOT NULL DEFAULT '{}';
ALTER TABLE catalog_images ADD COLUMN category text NOT NULL DEFAULT 'photo';
CREATE TABLE IF NOT EXISTS site_content_items (
  id text PRIMARY KEY NOT NULL,
  section text NOT NULL,
  title_vi text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  body_vi text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  published integer NOT NULL DEFAULT 1,
  deleted integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_site_content_section ON site_content_items (section, position, id);
