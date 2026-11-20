-- Journal (blog) posts live in site_content_items (section 'journal'). They gain a readable address (slug),
-- a short summary per language for Google and the list page, and publish / last-change dates.
ALTER TABLE site_content_items ADD COLUMN slug text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN excerpt_en text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN excerpt_vi text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN published_at text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN updated_at text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_content_slug ON site_content_items (slug) WHERE slug != '';
