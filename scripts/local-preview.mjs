// One command to run the whole site privately on this machine, with sample data and no Cloudflare
// account or Staydesk connection needed:
//
//   pnpm preview:local              build, set up a local database, start at http://127.0.0.1:8787
//   pnpm preview:local --skip-build reuse the last build (faster when only restarting)
//   pnpm preview:local --reset      wipe the local database first (fresh sample data, empty inquiries)
//   pnpm preview:local --port=8800  use another port
//
// By default it runs in demo mode (PREVIEW_DEMO=1) with admin password "preview-admin".
// To try real Staydesk data instead, create a `.dev.vars` file in the project root (it is git-ignored)
// with your variables, for example STAYDESK_CATALOG_SECRET=..., ADMIN_PASSWORD=... and no PREVIEW_DEMO.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const port = Number((args.find((arg) => arg.startsWith("--port=")) || "--port=8787").split("=")[1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("Use --port=<1024-65535>.");
  process.exit(1);
}

const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
// `node --import` needs a file:// URL; a bare C:\... path fails on Windows.
const sitesEnv = pathToFileURL(path.join(root, "scripts/sites-env.mjs")).href;
const serverDir = path.join(root, "dist/server");
const baseConfig = path.join(serverDir, "wrangler.json");
const localConfig = path.join(serverDir, "wrangler.local.json");
const state = path.join(root, ".wrangler/state");

function run(label, argv) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, argv, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error(`\nFailed: ${label}`);
    return false;
  }
  return true;
}

if (!existsSync(path.join(root, "node_modules"))) {
  console.error("Run `pnpm install` first.");
  process.exit(1);
}

if (has("--reset")) {
  rmSync(state, { recursive: true, force: true });
  console.log("Local database wiped.");
}

if (!has("--skip-build") || !existsSync(baseConfig)) {
  if (!run("Building the site (about a minute)", ["scripts/run-framework.mjs", "build"])) process.exit(1);
}

// Local-only copy of the build config that also tells wrangler where the SQL migrations live.
const config = JSON.parse(readFileSync(baseConfig, "utf8"));
config.d1_databases = (config.d1_databases || []).map((db) => ({
  ...db,
  migrations_dir: path.relative(serverDir, path.join(root, "drizzle")),
}));
writeFileSync(localConfig, JSON.stringify(config));

const migrated = run("Preparing the local database", [
  "--import", sitesEnv, wrangler, "d1", "migrations", "apply", "DB",
  "--local", "--persist-to", state, "--config", localConfig,
]);
if (!migrated) {
  console.error("If the error above mentions a table that already exists, run again with --reset to start fresh.");
  process.exit(1);
}

// Variables the site reads. A root .dev.vars (yours) wins; otherwise safe demo defaults.
const userVars = path.join(root, ".dev.vars");
const demo = !existsSync(userVars);
const vars = demo
  ? `PREVIEW_DEMO=1\nADMIN_PASSWORD=preview-admin\nSITE_URL=http://127.0.0.1:${port}\n`
  : readFileSync(userVars, "utf8");
writeFileSync(path.join(serverDir, ".dev.vars"), vars);

const base = `http://127.0.0.1:${port}`;
console.log(`
==============================================================
  DRM Stays - private preview${demo ? " (demo data)" : " (your .dev.vars)"}
  Site (VI):  ${base}/vi
  Site (EN):  ${base}/en
  Admin:      ${base}/admin${demo ? "   password: preview-admin" : ""}
  Stop:       press Ctrl+C
  Nothing here is public: it only listens on this computer.
==============================================================
`);

const started = spawnSync(process.execPath, [
  "--import", sitesEnv, wrangler, "dev", "--config", baseConfig, "--local",
  "--persist-to", state, "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0",
], { cwd: root, stdio: "inherit" });
process.exit(started.status ?? 0);
