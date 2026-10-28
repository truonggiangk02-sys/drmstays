CREATE TABLE IF NOT EXISTS partner_inquiries (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  property text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_inquiries_created ON partner_inquiries (created_at DESC);
