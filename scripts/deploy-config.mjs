// Turns the build's placeholder Worker config (dist/server/wrangler.json) into one with your real
// Cloudflare resources, written to dist/server/wrangler.deploy.json. Run after `pnpm build`.
//
//   D1_DATABASE_ID=<uuid> node scripts/deploy-config.mjs
//
// Optional: WORKER_NAME (default drmstays), D1_DATABASE_NAME (default drmstays-db),
// R2_BUCKET_NAME (default drmstays-media), SITE_URL, STAYDESK_CATALOG_URL.
// CUSTOM_DOMAINS=a.vn,www.a.vn attaches those domains to the Worker (their DNS must be in the same Cloudflare account).
// REDIRECT_HOSTS=www.a.vn,a.com makes those hosts redirect to SITE_URL.
// COMING_SOON=1 shows the "coming soon" page on every public URL (admin and APIs keep working).
// PREVIEW_DEMO=1 turns on sample data (staging only, never for the real site).
// STAGING=1 marks a staging copy: it is never indexed (X-Robots-Tag, meta robots, robots.txt Disallow: /). *.workers.dev addresses count as staging too.
// GA_MEASUREMENT_ID (G-XXXXXXXXXX) turns on Google Analytics; it only runs on the real site, never on staging, preview or coming-soon.
// SITE_URL is required (the public address, https, no path); ALLOW_MISSING_SITE_URL=1 skips that check on purpose.
// NO_R2=1 leaves out the photo bucket (fine for a demo/staging copy: admin photo upload then won't work).
// Secrets (ADMIN_PASSWORD, tokens...) are never written here; set them with `wrangler secret put`.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkSiteUrl, willBeIndexable } from "./site-url-check.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "dist/server/wrangler.json");
const target = path.join(root, "dist/server/wrangler.deploy.json");

const siteCheck = checkSiteUrl(process.env.SITE_URL, process.env);
siteCheck.notes.forEach((note) => console.log(`Note: ${note}`));
if (siteCheck.errors.length) {
  siteCheck.errors.forEach((error) => console.error(`Error: ${error}`));
  process.exit(1);
}

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
for (const key of ["SITE_URL", "STAYDESK_CATALOG_URL", "PREVIEW_DEMO", "REDIRECT_HOSTS", "COMING_SOON", "STAGING", "GA_MEASUREMENT_ID"]) {
  const value = process.env[key]?.trim();
  if (value) vars[key] = value;
}
config.vars = vars;

const domains = (process.env.CUSTOM_DOMAINS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
if (domains.some((domain) => !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain))) {
  console.error("CUSTOM_DOMAINS must be a comma-separated list of plain host names, e.g. drmstays.vn,www.drmstays.vn");
  process.exit(1);
}
if (domains.length) config.routes = domains.map((pattern) => ({ pattern, custom_domain: true }));

writeFileSync(target, JSON.stringify(config));
console.log(`Wrote ${path.relative(root, target)} (worker "${config.name}", D1 "${config.d1_databases[0].database_name}", R2 ${config.r2_buckets[0] ? `"${config.r2_buckets[0].bucket_name}"` : "off"}).`);
console.log(`SITE_URL: ${siteCheck.origin || "(not set)"}. Search engines will be ${willBeIndexable(siteCheck.origin, process.env) ? "ALLOWED to index this site" : "BLOCKED from indexing this site (staging, preview, coming-soon or workers.dev address)"}.`);
