#!/usr/bin/env node
// Crawls the live site like a visitor and reports what is broken. Nothing is changed on the site.
//
//   node scripts/site-check.mjs https://drmstays.vn                    what a visitor sees
//   node scripts/site-check.mjs https://drmstays.vn --password=...      also logs in as the owner (sees through "coming soon",
//                                                                       checks the admin pages and reads the admin health page)
//   add --browser to also open pages in a real browser (needs `npm install playwright --no-save`):
//                                                                       console errors, broken images, sideways scroll on phones
// The password can come from the ADMIN_PASSWORD environment variable instead; it is never printed or saved.
// Exit code 1 when anything FAILS, so it can gate a release.
import { writeFileSync } from 'node:fs';

// /vi/journal is left out on purpose: the journal stays hidden (404) until it has its first article. Once it has posts, the crawler finds the page through the links.
const SEED = ['/', '/vi', '/en', '/vi/stays', '/en/stays', '/vi/services', '/vi/about', '/vi/faq', '/vi/contact', '/vi/partners', '/vi/privacy', '/vi/cancellation', '/vi/terms'];
const SOFT_ERRORS = ["couldn't load", 'couldn’t load', 'Danh sách hiện chưa sẵn sàng', 'The catalog is temporarily unavailable', 'Các tòa nhà đang được cập nhật', 'Buildings are being updated', 'Internal Server Error'];

/** Facts about one HTML page, read with plain patterns (enough for health checks, no DOM needed). */
export function readPage(html, origin) {
  const tag = (re) => (html.match(re) || [])[1]?.trim();
  const attr = (el, name) => (el.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i')) || [])[2] ?? (el.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i')) || [])[3];
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ src: attr(m[0], 'src'), hasAlt: /\salt=/i.test(m[0]), alt: attr(m[0], 'alt'), sized: /\swidth=/i.test(m[0]) && /\sheight=/i.test(m[0]) }));
  const links = [...new Set([...html.matchAll(/<a\b[^>]*\shref=("([^"]*)"|'([^']*)')/gi)].map((m) => m[2] ?? m[3]).filter(Boolean))];
  const internal = links.filter((h) => (h.startsWith('/') && !h.startsWith('//')) || h.startsWith(origin)).map((h) => h.replace(origin, '').split('#')[0]).filter((h) => h && !/^\/(_next|api)\b/.test(h));
  return {
    title: tag(/<title[^>]*>([^<]*)<\/title>/i), description: (html.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [''])[0] ? attr((html.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [''])[0], 'content') : undefined,
    canonical: (() => { const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i); return m ? attr(m[0], 'href') : undefined; })(),
    lang: tag(/<html[^>]*\slang=["']([^"']*)["']/i), h1: (html.match(/<h1[\s>]/gi) || []).length, main: /<main[\s>]/i.test(html),
    noindex: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html), mixed: [...html.matchAll(/(?:src|href)=["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]).filter((u) => !/w3\.org|localhost|127\.0\.0\.1/.test(u)),
    imgs, internal: [...new Set(internal)], soft: SOFT_ERRORS.filter((phrase) => html.includes(phrase)),
  };
}

const unescapeHtml = (text) => text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const results = [];
const add = (status, group, label, detail = '') => results.push({ status, group, label, detail });

async function main() {
  const args = process.argv.slice(2), flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
  const site = (args.find((a) => /^https?:\/\//.test(a)) || '').replace(/\/+$/, '');
  if (!site) { console.log('Cách dùng: node scripts/site-check.mjs https://tên-web [--password=...] [--browser] [--max=40]'); process.exit(1); }
  const origin = new URL(site).origin, max = Number(flag('max')) || 40, headers = { 'User-Agent': 'drm-site-check/1.0' };
  const password = flag('password') || process.env.ADMIN_PASSWORD;

  if (password) {
    const login = await fetch(`${origin}/api/admin/login`, { method: 'POST', redirect: 'manual', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password }) });
    const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('__Host-doraemon_admin='));
    if (cookie) { headers.Cookie = cookie; add('ok', 'Đăng nhập', 'Đăng nhập admin', 'Đã vào được (kiểm tra như chủ web).'); } else add('fail', 'Đăng nhập', 'Đăng nhập admin', 'Sai mật khẩu hoặc bị khóa tạm (sai quá nhiều lần).');
  } else add('warn', 'Đăng nhập', 'Không có mật khẩu admin', 'Chỉ kiểm tra như khách. Nếu web đang ở chế độ "Sắp ra mắt", khách chỉ thấy trang chờ.');

  const get = async (path, init = {}) => { const started = Date.now(); try { const response = await fetch(origin + path, { redirect: 'follow', headers, ...init }); return { response, ms: Date.now() - started }; } catch (error) { return { error: error.message, ms: Date.now() - started }; } };

  // robots + sitemap
  const robots = await get('/robots.txt');
  add(robots.response?.ok ? 'ok' : 'fail', 'SEO', 'robots.txt', robots.response ? `HTTP ${robots.response.status}` : robots.error);
  const sitemap = await get('/sitemap.xml'); const sitemapText = sitemap.response?.ok ? await sitemap.response.text() : '';
  const sitemapUrls = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  add(sitemap.response?.ok ? (sitemapUrls.length ? 'ok' : 'warn') : 'fail', 'SEO', 'sitemap.xml', sitemap.response ? `${sitemapUrls.length} địa chỉ${sitemapUrls.length ? '' : ' (rỗng: bình thường khi đang "Sắp ra mắt")'}` : sitemap.error);

  // A closed site would turn every page into a failure: say it once and stop, unless we are logged in.
  const probe = await get('/vi');
  if (probe.response?.status === 503 && !headers.Cookie && (await probe.response.text()).includes('Sắp ra mắt')) {
    add('warn', 'Trang', 'Web đang ở chế độ "Sắp ra mắt"', 'Khách chỉ thấy trang chờ nên không quét được nội dung. Chạy lại với --password=... để kiểm tra như chủ web, hoặc deploy với -Live / --live để mở web.');
    return report(site);
  }

  // crawl
  const queue = [...SEED, ...sitemapUrls.map((u) => u.replace(origin, '')).filter((u) => u.startsWith('/')).slice(0, max)];
  const seen = new Set(), pages = [], imageUrls = new Set(), linkUrls = new Set();
  while (queue.length && seen.size < max) {
    const path = queue.shift(); if (seen.has(path)) continue; seen.add(path);
    const { response, error, ms } = await get(path);
    if (!response) { add('fail', 'Trang', path, `Không kết nối được: ${error}`); continue; }
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) { add(response.ok ? 'ok' : 'fail', 'Trang', path, `HTTP ${response.status} (${type})`); continue; }
    const html = await response.text(), page = readPage(html, origin); pages.push({ path, page });
    const problems = [];
    if (response.status >= 400) problems.push(`HTTP ${response.status}`);
    if (response.status === 503 && html.includes('Sắp ra mắt')) problems.push('trang "Sắp ra mắt" (web đang đóng với khách)');
    if (page.soft.length) problems.push(`thông báo lỗi trên trang: "${page.soft[0]}"`);
    add(problems.length ? 'fail' : ms > 3000 ? 'warn' : 'ok', 'Trang', path, problems.length ? problems.join('; ') : `HTTP ${response.status}, ${ms} ms`);
    if (response.status < 400 && !page.noindex && !problems.length) {
      const seo = [];
      if (!page.title) seo.push('thiếu <title>'); if (!page.description) seo.push('thiếu mô tả'); if (!page.canonical) seo.push('thiếu canonical');
      if (!page.lang) seo.push('thiếu lang'); if (page.h1 !== 1) seo.push(`${page.h1} thẻ h1 (cần 1)`); if (!page.main) seo.push('thiếu <main>');
      const noAlt = page.imgs.filter((i) => !i.hasAlt).length; if (noAlt) seo.push(`${noAlt} ảnh thiếu alt`);
      const unsized = page.imgs.filter((i) => i.src && !i.sized && !i.src.startsWith('data:')).length; if (unsized > 3) seo.push(`${unsized} ảnh thiếu width/height`);
      if (page.mixed.length) seo.push(`nội dung http (không an toàn): ${page.mixed[0]}`);
      if (seo.length) add('warn', 'SEO và trình bày', path, seo.join('; '));
    }
    page.imgs.forEach((i) => i.src && !i.src.startsWith('data:') && imageUrls.add(i.src)); page.internal.forEach((l) => { linkUrls.add(l); if (!seen.has(l) && queue.length < max * 3) queue.push(l); });
  }
  add('ok', 'Trang', `Đã quét ${pages.length} trang`, `${imageUrls.size} ảnh, ${linkUrls.size} liên kết nội bộ`);

  // images and links really load
  const brokenImages = [], brokenLinks = [];
  for (const src of [...imageUrls].slice(0, 80)) {
    const url = src.startsWith('http') ? src : origin + src; if (!url.startsWith(origin)) continue;
    const { response } = await get(url.replace(origin, ''), { method: 'GET' });
    if (!response || !response.ok || !(response.headers.get('content-type') || '').startsWith('image/')) brokenImages.push(`${src} → ${response?.status ?? 'không tải được'}`);
  }
  add(brokenImages.length ? 'fail' : 'ok', 'Ảnh', 'Ảnh tải được', brokenImages.length ? `${brokenImages.length} ảnh lỗi: ${brokenImages.slice(0, 3).join(' | ')}` : `${Math.min(imageUrls.size, 80)} ảnh đều tải được.`);
  for (const link of [...linkUrls].filter((l) => !seen.has(l)).slice(0, 60)) { const { response } = await get(link); if (!response || response.status >= 400) brokenLinks.push(`${link} → ${response?.status ?? 'lỗi'}`); }
  add(brokenLinks.length ? 'fail' : 'ok', 'Liên kết', 'Liên kết nội bộ', brokenLinks.length ? `${brokenLinks.length} liên kết hỏng: ${brokenLinks.slice(0, 3).join(' | ')}` : 'Không có liên kết hỏng.');

  // security headers
  const home = await get('/vi'); const h = home.response?.headers;
  for (const [name, label] of [['content-security-policy', 'Content-Security-Policy'], ['strict-transport-security', 'HSTS'], ['x-content-type-options', 'X-Content-Type-Options'], ['x-frame-options', 'X-Frame-Options']])
    add(h?.get(name) ? 'ok' : 'warn', 'Bảo mật', label, h?.get(name) ? 'Có.' : 'Thiếu trên trang chủ.');

  // admin
  if (headers.Cookie) {
    for (const path of ['/admin', '/admin/catalog', '/admin/media', '/admin/locations', '/admin/catalog-inquiries', '/admin/contact-channels']) { const { response } = await get(path); add(response?.ok ? 'ok' : 'fail', 'Admin', path, `HTTP ${response?.status ?? 'lỗi'}`); }
    const health = await get('/admin/health');
    if (health.response?.ok) {
      const html = await health.response.text();
      for (const m of html.matchAll(/<li class="is-(fail|warn)"><i[^>]*>[^<]*<\/i><div><strong>([^<]*)<\/strong><span>([^<]*)<\/span>/g)) add(m[1], 'Trang "Kiểm tra web" của admin', unescapeHtml(m[2]), unescapeHtml(m[3]));
      if (!/<li class="is-(fail|warn)"/.test(html)) add('ok', 'Trang "Kiểm tra web" của admin', 'Tất cả mục', 'Không có lỗi hay cảnh báo.');
    } else add('fail', 'Admin', '/admin/health', `HTTP ${health.response?.status ?? 'lỗi'} (bản web chưa có trang này?)`);
  }

  if (args.includes('--browser')) await browserChecks(origin, headers.Cookie, ['/vi', '/vi/stays', ...pages.map((p) => p.path).filter((p) => /\/(types|rooms|buildings)\//.test(p)).slice(0, 4)]);
  report(site);
}

async function browserChecks(origin, cookie, paths) {
  let playwright; try { playwright = await import('playwright'); } catch { add('warn', 'Trình duyệt', 'Playwright', 'Chưa cài. Chạy: npm install playwright --no-save && npx playwright install chromium'); return; }
  const browser = await playwright.chromium.launch();
  for (const [name, viewport] of [['máy tính', { width: 1440, height: 900 }], ['điện thoại', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport }); if (cookie) await context.addCookies([{ name: cookie.split('=')[0], value: cookie.slice(cookie.indexOf('=') + 1), url: origin }]);
    for (const path of paths) {
      const page = await context.newPage(), errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 100))); page.on('console', (m) => { if (m.type() === 'error' && !/cloudflareinsights|favicon/.test(m.text())) errors.push(m.text().slice(0, 100)); });
      await page.goto(origin + path, { waitUntil: 'networkidle' }).catch(() => {});
      const info = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.slice(-40)), crash: /couldn.t load/.test(document.body.innerText) }));
      const problems = [...errors.slice(0, 2), ...(info.overflow ? ['trang tràn ngang'] : []), ...(info.broken.length ? [`${info.broken.length} ảnh không hiện`] : []), ...(info.crash ? ['màn hình lỗi "couldn\'t load"'] : [])];
      add(problems.length ? 'fail' : 'ok', `Trình duyệt (${name})`, path, problems.join('; ') || 'Không có lỗi.'); await page.close();
    }
    await context.close();
  }
  await browser.close();
}

function report(site) {
  const mark = { ok: '✔', warn: '!', fail: '✖' }, groups = [...new Set(results.map((r) => r.group))];
  const lines = [`# Kiểm tra ${site} — ${new Date().toLocaleString('vi-VN')}`, ''];
  for (const group of groups) { lines.push(`## ${group}`); results.filter((r) => r.group === group).forEach((r) => lines.push(`- ${mark[r.status]} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`)); lines.push(''); }
  const count = (s) => results.filter((r) => r.status === s).length;
  lines.push(`**Tổng: ${count('ok')} đạt, ${count('warn')} cần chú ý, ${count('fail')} lỗi.**`);
  const text = lines.join('\n'); console.log(text); writeFileSync('site-check-report.md', text + '\n'); console.log('\n(Đã lưu site-check-report.md)');
  process.exitCode = count('fail') ? 1 : 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').slice(-2).join('/'))) await main();
