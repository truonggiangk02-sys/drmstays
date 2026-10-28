ALTER TABLE catalog_inquiries ADD COLUMN telegram_status text NOT NULL DEFAULT 'not_applicable';
--> statement-breakpoint
ALTER TABLE partner_inquiries ADD COLUMN telegram_status text NOT NULL DEFAULT 'not_applicable';
