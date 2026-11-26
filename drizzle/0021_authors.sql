-- Named authors for journal posts (name, job title, short bio, photo) and the old addresses of posts whose address
-- was changed after publishing, so the old links keep working (301).
CREATE TABLE IF NOT EXISTS authors (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_id text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  -- 'person' or 'team' (for example "DRM Stays Marketing Team"): a team is declared to Google as an organization.
  kind text NOT NULL DEFAULT 'person'
);
--> statement-breakpoint
-- The author of the guides is the company's marketing team. The owner can add a short description and a logo in /admin/journal.
INSERT OR IGNORE INTO authors (id, name, role, bio, photo_id, url, kind) VALUES ('5b1f6d3e-8c2a-4f7e-9a41-d2a0c4e7b001', 'DRM Stays Marketing Team', '', '', '', '', 'team');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS journal_redirects (
  old_slug text PRIMARY KEY NOT NULL,
  post_id text NOT NULL
);
