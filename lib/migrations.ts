/**
 * Every database migration the code expects, oldest first. Keep in step with drizzle/*.sql
 * (tests/migrations.test.ts fails when they differ). The health page compares this list with what the
 * live database has applied, so a deploy without `-Migrate` is caught at once.
 */
export const EXPECTED_MIGRATIONS = [
  '0000_staydanang', '0001_rates', '0002_whatsapp_inquiries', '0003_cms', '0004_room_building', '0005_dynamic_rooms',
  '0006_public_catalog', '0007_partner_inquiries', '0008_rich_catalog_and_content', '0009_landmarks', '0010_route_geometry',
  '0011_contact_channels', '0012_inquiry_alerts', '0013_room_types', '0014_seo_foundation', '0015_home_content',
] as const;

/** Names recorded by `wrangler d1 migrations apply` carry a .sql suffix. */
export const pendingMigrations = (applied: string[]) => {
  const done = new Set(applied.map(name => name.replace(/\.sql$/, '')));
  return EXPECTED_MIGRATIONS.filter(name => !done.has(name));
};
