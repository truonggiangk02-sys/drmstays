CREATE TABLE IF NOT EXISTS room_details (
  id integer PRIMARY KEY NOT NULL,
  amenities text NOT NULL,
  sqm integer NOT NULL,
  beds text NOT NULL,
  wifi text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS room_images (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  apartment_id integer NOT NULL,
  mime text NOT NULL,
  image_data text NOT NULL,
  alt text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_room_images_order ON room_images (apartment_id, position, id);
