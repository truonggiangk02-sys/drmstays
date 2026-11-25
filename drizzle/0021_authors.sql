-- Named authors for journal posts (name, job title, short bio, photo) and the old addresses of posts whose address
-- was changed after publishing, so the old links keep working (301).
CREATE TABLE IF NOT EXISTS authors (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_id text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS journal_redirects (
  old_slug text PRIMARY KEY NOT NULL,
  post_id text NOT NULL
);
