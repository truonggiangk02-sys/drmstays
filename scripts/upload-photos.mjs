#!/usr/bin/env node
// Uploads photos from a folder on this computer to the website, matching folders to buildings and rooms.
//
//   node scripts/upload-photos.mjs <folder> --site=https://your-site            (dry run: only prints the plan)
//   node scripts/upload-photos.mjs <folder> --site=https://your-site --apply    (uploads)
//
// Folder layout (names are matched to the names in the admin, ignoring case, accents and punctuation):
//   <folder>/<Building>/*.jpg                  photos of the building
//   <folder>/<Building>/mat-bang/*.jpg         floor plans of the building (folder: mat-bang, floorplan, layout)
//   <folder>/<Building>/<Room>/*.jpg           photos of a room
//   <folder>/<Building>/<Room>/mat-bang/*.jpg  floor plans of a room
// Files upload in name order; the first photo of an item becomes its cover.
// Items that already have photos are skipped unless --force is given. The admin password is read from the
// ADMIN_PASSWORD environment variable, or asked for here; it is never printed or saved.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 5_000_000, MAX_PER_ITEM = 20, BATCH_BYTES = 18_000_000;
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const PLAN_DIR = /^(mat-?bang|floor-?plans?|layout|so-?do)$/i;

export const normalise = (text) =>
  String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '');
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** Reads <folder>/<Building>/[<Room>/][plan folder/] into a flat list of { path, building, room, category, files }. */
export function scanFolder(root) {
  const groups = [];
  const list = (dir) => readdirSync(dir, { withFileTypes: true });
  const images = (dir) => list(dir).filter((e) => e.isFile() && MIME[extname(e.name).toLowerCase()]).map((e) => e.name).sort(byName).map((n) => join(dir, n));
  const collect = (dir, building, room) => {
    const photos = images(dir);
    if (photos.length) groups.push({ building, room, category: 'photo', files: photos });
    for (const entry of list(dir).filter((e) => e.isDirectory() && PLAN_DIR.test(e.name))) {
      const plans = images(join(dir, entry.name));
      if (plans.length) groups.push({ building, room, category: 'floorplan', files: plans });
    }
  };
  for (const b of list(root).filter((e) => e.isDirectory()).sort((x, y) => byName(x.name, y.name))) {
    const bdir = join(root, b.name);
    collect(bdir, b.name, null);
    for (const r of list(bdir).filter((e) => e.isDirectory() && !PLAN_DIR.test(e.name)).sort((x, y) => byName(x.name, y.name)))
      collect(join(bdir, r.name), b.name, r.name);
  }
  return groups;
}

/** Matches each group to a building/room from the site's index. Returns { plan, problems }. */
export function buildPlan(groups, index, { force = false } = {}) {
  const plan = [], problems = [], seen = new Set();
  for (const group of groups) {
    const building = index.buildings.find((b) => normalise(b.name) === normalise(group.building));
    if (!building) { problems.push(`Không tìm thấy tòa "${group.building}" trên website (${group.files.length} ảnh bỏ qua)`); continue; }
    const item = group.room ? building.rooms.find((r) => normalise(r.name) === normalise(group.room)) : building;
    if (!item) { problems.push(`Không tìm thấy phòng "${group.room}" trong tòa "${building.name}" (${group.files.length} ảnh bỏ qua)`); continue; }
    const key = `${item.id}|${group.category}`;
    if (seen.has(key)) { problems.push(`Hai thư mục cùng trỏ tới "${group.room ? `${building.name} / ${item.name}` : building.name}" (${group.files.length} ảnh bỏ qua)`); continue; }
    seen.add(key);
    const existing = group.category === 'photo' ? item.photos : item.floorplans;
    const label = group.room ? `${building.name} / ${item.name}` : building.name;
    if (existing > 0 && !force) { plan.push({ ...group, label, kind: group.room ? 'room' : 'building', id: item.id, skip: `đã có ${existing} ảnh (dùng --force để thêm)`, upload: [] }); continue; }
    const room = Math.max(0, MAX_PER_ITEM - (item.photos + item.floorplans));
    plan.push({ ...group, label, kind: group.room ? 'room' : 'building', id: item.id, alt: group.room ? `${item.name} – ${building.name}` : building.name, upload: group.files.slice(0, room), skip: group.files.length > room ? `chỉ còn chỗ cho ${room} ảnh (tối đa ${MAX_PER_ITEM}/mục)` : '' });
  }
  return { plan, problems };
}

function ask(question, hidden) {
  return new Promise((done) => {
    stdout.write(question);
    let value = '';
    if (!stdin.isTTY || !hidden) { stdin.once('data', (d) => done(String(d).trim())); return; }
    stdin.setRawMode(true); stdin.resume(); stdin.setEncoding('utf8');
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') { stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); stdout.write('\n'); done(value); }
      else if (ch === '\u0003') process.exit(1);
      else if (ch === '\u007f') value = value.slice(0, -1);
      else value += ch;
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const folder = args.find((a) => !a.startsWith('--'));
  const site = (flag('site') || process.env.SITE_URL || '').replace(/\/+$/, '');
  const apply = args.includes('--apply'), force = args.includes('--force');
  if (!folder || !site) { console.log('Cách dùng: node scripts/upload-photos.mjs <thư-mục-ảnh> --site=https://tên-web [--apply] [--force]'); process.exit(1); }
  const origin = new URL(site).origin;
  const root = resolve(folder);
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) { console.log(`Không thấy thư mục: ${root}`); process.exit(1); }

  const password = process.env.ADMIN_PASSWORD || await ask('Mật khẩu admin (không hiện khi gõ): ', true);
  const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', redirect: 'manual', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password }) });
  const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('__Host-doraemon_admin='));
  if (!cookie) { console.log(login.status === 303 && /limited/.test(login.headers.get('location') || '') ? 'Đăng nhập bị khóa tạm thời (sai quá nhiều lần). Thử lại sau 15 phút.' : 'Sai mật khẩu admin hoặc địa chỉ web.'); process.exit(1); }
  const headers = { Origin: origin, Cookie: cookie };

  const indexResponse = await fetch(`${origin}/api/admin/catalog-index`, { method: 'POST', headers });
  if (!indexResponse.ok) { console.log(`Không đọc được danh sách tòa/phòng (${indexResponse.status}).`); process.exit(1); }
  const { plan, problems } = buildPlan(scanFolder(root), await indexResponse.json(), { force });

  console.log(apply ? '\nĐANG TẢI LÊN\n' : '\nCHẠY THỬ (chưa tải gì). Thêm --apply để tải thật.\n');
  let total = 0;
  for (const step of plan) {
    total += step.upload.length;
    console.log(`${step.skip && !step.upload.length ? '⏭ ' : '• '}${step.label} [${step.category === 'photo' ? 'ảnh' : 'mặt bằng'}]: ${step.upload.length} ảnh${step.skip ? ` — ${step.skip}` : ''}`);
  }
  for (const problem of problems) console.log(`⚠ ${problem}`);
  console.log(`\nTổng: ${total} ảnh sẽ được tải${problems.length ? `, ${problems.length} cảnh báo` : ''}.`);
  if (!apply) return;

  let sharp = null;
  try { sharp = (await import('sharp')).default; } catch { /* optional: only needed for photos over 5 MB */ }
  let uploaded = 0; const failed = [];
  for (const step of plan) {
    const prepared = [];
    for (const path of step.upload) {
      let bytes = readFileSync(path), type = MIME[extname(path).toLowerCase()], name = basename(path);
      if (bytes.length > MAX_BYTES) {
        if (!sharp) { failed.push(`${step.label}/${name}: quá 5 MB (chạy "npm install sharp --no-save" để tự nén, hoặc nén ảnh trước)`); continue; }
        bytes = await sharp(bytes).rotate().resize(2400, 2400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
        type = 'image/jpeg'; name = name.replace(/\.\w+$/, '') + '.jpg';
      }
      prepared.push({ bytes, type, name });
    }
    for (let i = 0; i < prepared.length;) {
      const batch = []; let size = 0;
      while (i < prepared.length && (!batch.length || size + prepared[i].bytes.length <= BATCH_BYTES)) { batch.push(prepared[i]); size += prepared[i].bytes.length; i += 1; }
      const form = new FormData();
      form.set('kind', step.kind); form.set('sourceId', step.id); form.set('category', step.category); form.set('alt', step.alt || '');
      for (const file of batch) form.append('image', new Blob([file.bytes], { type: file.type }), file.name);
      const response = await fetch(`${origin}/api/admin/catalog-images`, { method: 'POST', headers: { ...headers, Accept: 'application/json' }, body: form });
      const result = await response.json().catch(() => null);
      if (!result) { failed.push(`${step.label}: lỗi ${response.status}`); continue; }
      uploaded += result.uploaded || 0;
      failed.push(...(result.failed || []).map((f) => `${step.label}/${f}`));
    }
    console.log(`✔ ${step.label} [${step.category}]`);
  }
  console.log(`\nXong: ${uploaded} ảnh đã tải.${failed.length ? `\nLỗi (${failed.length}):\n- ${failed.join('\n- ')}` : ''}`);
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await main();
