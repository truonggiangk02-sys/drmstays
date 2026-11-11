-- Social profile links (Instagram, TikTok, ...) the owner edits in /admin/contact-channels.
-- No CHECK on the network name: adding a network later only needs a code change, not a migration.
CREATE TABLE IF NOT EXISTS social_links (
  network text PRIMARY KEY NOT NULL,
  url text NOT NULL DEFAULT '',
  published integer NOT NULL DEFAULT 0 CHECK (published IN (0, 1))
);
