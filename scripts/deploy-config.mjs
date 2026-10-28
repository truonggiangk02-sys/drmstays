// Turns the build's placeholder Worker config (dist/server/wrangler.json) into one with your real
// Cloudflare resources, written to dist/server/wrangler.deploy.json. Run after `pnpm build`.
//
//   D1_DATABASE_ID=<uuid> node scripts/deploy-config.mjs
//
// Optional: WORKER_NAME (default drmstays), D1_DATABASE_NAME (default drmstays-db),
// R2_BUCKET_NAME (default drmstays-media), SITE_URL, STAYDESK_CATALOG_URL.
// PREVIEW_DEMO=1 turns on sample data (staging only, never for the real site).
// NO_R2=1 leaves out the photo bucket (fine for a demo/staging copy: admin photo upload then won't work).
// Secrets (ADMIN_PASSWORD, tokens...) are never written here; set them with `wrangler secret put`.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "dist/server/wrangler.json");
const target = path.join(root, "dist/server/wrangler.deploy.json");

const databaseId = process.env.D1_DATABASE_ID?.trim();
if (!databaseId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId)) {
  console.error("Set D1_DATABASE_ID to the UUID printed by `wrangler d1 create`.");
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(source, "utf8"));
} catch {
  console.error("dist/server/wrangler.json not found. Run `pnpm build` first.");
  process.exit(1);
}

config.name = process.env.WORKER_NAME?.trim() || "drmstays";
config.d1_databases = [{
  binding: "DB",
  database_name: process.env.D1_DATABASE_NAME?.trim() || "drmstays-db",
  database_id: databaseId,
  // Lets `wrangler d1 migrations apply` track which of drizzle/*.sql already ran.
  migrations_dir: path.relative(path.dirname(target), path.join(root, "drizzle")),
}];
config.r2_buckets = process.env.NO_R2 === "1"
  ? []
  : [{ binding: "BUCKET", bucket_name: process.env.R2_BUCKET_NAME?.trim() || "drmstays-media" }];

const vars = { ...(config.vars || {}) };
for (const key of ["SITE_URL", "STAYDESK_CATALOG_URL", "PREVIEW_DEMO"]) {
  const value = process.env[key]?.trim();
  if (value) vars[key] = value;
}
config.vars = vars;

writeFileSync(target, JSON.stringify(config));
console.log(`Wrote ${path.relative(root, target)} (worker "${config.name}", D1 "${config.d1_databases[0].database_name}", R2 ${config.r2_buckets[0] ? `"${config.r2_buckets[0].bucket_name}"` : "off"}).`);
