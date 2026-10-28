CREATE TABLE IF NOT EXISTS contact_channels (
  channel text PRIMARY KEY NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'facebook', 'zalo')),
  url text NOT NULL DEFAULT '',
  published integer NOT NULL DEFAULT 0 CHECK (published IN (0, 1))
);
