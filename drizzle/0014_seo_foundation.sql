-- SEO foundation, step 1.
-- Photos: pixel size, so pages can reserve the space (width/height on <img>) and og:image can state it.
ALTER TABLE catalog_images ADD COLUMN width integer;
--> statement-breakpoint
ALTER TABLE catalog_images ADD COLUMN height integer;
--> statement-breakpoint
-- Buildings, rooms and room types: when they last changed, for <lastmod> in sitemap.xml.
-- Existing rows stay NULL (unknown) until they are next edited; sitemap.xml leaves <lastmod> out for them.
ALTER TABLE catalog_buildings ADD COLUMN updated_at text;
--> statement-breakpoint
ALTER TABLE catalog_rooms ADD COLUMN updated_at text;
--> statement-breakpoint
ALTER TABLE catalog_room_types ADD COLUMN updated_at text;
--> statement-breakpoint
-- Triggers keep updated_at current, so none of the admin save routes need to change. The WHEN guard stops a trigger from firing itself.
CREATE TRIGGER IF NOT EXISTS trg_catalog_buildings_insert AFTER INSERT ON catalog_buildings
BEGIN UPDATE catalog_buildings SET updated_at = CURRENT_TIMESTAMP WHERE source_id = NEW.source_id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_catalog_buildings_update AFTER UPDATE ON catalog_buildings WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE catalog_buildings SET updated_at = CURRENT_TIMESTAMP WHERE source_id = NEW.source_id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_catalog_rooms_insert AFTER INSERT ON catalog_rooms
BEGIN UPDATE catalog_rooms SET updated_at = CURRENT_TIMESTAMP WHERE source_id = NEW.source_id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_catalog_rooms_update AFTER UPDATE ON catalog_rooms WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE catalog_rooms SET updated_at = CURRENT_TIMESTAMP WHERE source_id = NEW.source_id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_catalog_room_types_insert AFTER INSERT ON catalog_room_types
BEGIN UPDATE catalog_room_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_catalog_room_types_update AFTER UPDATE ON catalog_room_types WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE catalog_room_types SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
--> statement-breakpoint
-- Adding or removing a photo counts as a change to the item it belongs to.
CREATE TRIGGER IF NOT EXISTS trg_catalog_images_insert AFTER INSERT ON catalog_images
BEGIN
  UPDATE catalog_buildings SET updated_at = CURRENT_TIMESTAMP WHERE NEW.owner_type = 'building' AND source_id = NEW.owner_id;
  UPDATE catalog_rooms SET updated_at = CURRENT_TIMESTAMP WHERE NEW.owner_type = 'room' AND source_id = NEW.owner_id;
  UPDATE catalog_room_types SET updated_at = CURRENT_TIMESTAMP WHERE NEW.owner_type = 'roomtype' AND id = NEW.owner_id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_catalog_images_delete AFTER DELETE ON catalog_images
BEGIN
  UPDATE catalog_buildings SET updated_at = CURRENT_TIMESTAMP WHERE OLD.owner_type = 'building' AND source_id = OLD.owner_id;
  UPDATE catalog_rooms SET updated_at = CURRENT_TIMESTAMP WHERE OLD.owner_type = 'room' AND source_id = OLD.owner_id;
  UPDATE catalog_room_types SET updated_at = CURRENT_TIMESTAMP WHERE OLD.owner_type = 'roomtype' AND id = OLD.owner_id;
END;
