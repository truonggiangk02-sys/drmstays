-- Journal (blog) posts follow the SEO-GEO standard: a Google title apart from the H1, a primary keyword, template, level,
-- topic, author, a workflow status and who checked the post. Still stored in site_content_items (section 'journal').
ALTER TABLE site_content_items ADD COLUMN seo_title_en text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN primary_keyword text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN keyword_variations text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN search_intent text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN post_template text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN post_level text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN topic text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN author_id text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN status text NOT NULL DEFAULT 'draft';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN checks_json text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN checked_by text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN checked_at text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE site_content_items ADD COLUMN cover_alt_en text NOT NULL DEFAULT '';
--> statement-breakpoint
-- Posts that are already live keep showing: published = 1 now also reads status = 'published'.
UPDATE site_content_items SET status = 'published' WHERE section = 'journal' AND published = 1 AND deleted = 0;
