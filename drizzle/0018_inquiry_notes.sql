-- A private note on each guest and partner request (who called, what was agreed), visible to the admin only.
ALTER TABLE catalog_inquiries ADD COLUMN note text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE partner_inquiries ADD COLUMN note text NOT NULL DEFAULT '';
