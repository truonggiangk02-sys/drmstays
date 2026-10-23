ALTER TABLE room_details ADD COLUMN address text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE room_details ADD COLUMN area text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE room_details ADD COLUMN view text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE room_details ADD COLUMN guests integer NOT NULL DEFAULT 2;
--> statement-breakpoint
ALTER TABLE room_details ADD COLUMN available_units integer;
--> statement-breakpoint
ALTER TABLE room_details ADD COLUMN is_custom integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE listing_overrides SET building = 'AnLiu Apartment' WHERE building = 'AnLuu Apartment';
--> statement-breakpoint
UPDATE listing_overrides SET name = replace(name, 'AnLuu', 'AnLiu'), description = replace(description, 'AnLuu', 'AnLiu') WHERE instr(name, 'AnLuu') > 0 OR instr(description, 'AnLuu') > 0;
--> statement-breakpoint
UPDATE room_details SET available_units = 5 WHERE id = 1 AND available_units IS NULL;
--> statement-breakpoint
UPDATE room_details SET available_units = 10 WHERE id = 2 AND available_units IS NULL;
--> statement-breakpoint
UPDATE room_details SET available_units = 20 WHERE id = 3 AND available_units IS NULL;
