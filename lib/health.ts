import { env } from 'cloudflare:workers';
import { buildingFromPrice, buildingPhotos, buildingRoomCount } from './building-media';
import { pendingMigrations } from './migrations';
import { getPublicCatalog } from './public-catalog';
import { getFreshStaydeskCatalog } from './staydesk-catalog';

export type Check = { id: string; group: string; label: string; status: 'ok' | 'warn' | 'fail'; detail: string };
const ok = (group: string, id: string, label: string, detail = ''): Check => ({ group, id, label, status: 'ok', detail });
const warn = (group: string, id: string, label: string, detail: string): Check => ({ group, id, label, status: 'warn', detail });
const fail = (group: string, id: string, label: string, detail: string): Check => ({ group, id, label, status: 'fail', detail });
const reason = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 240);

/** Everything that has gone wrong silently before: settings, migrations, Staydesk, the public catalog, photos in storage. */
export async function runHealthChecks(): Promise<Check[]> {
  const checks: Check[] = [];
  const e = env as unknown as Record<string, unknown>;

  // 1. Settings
  checks.push(e.SITE_URL ? ok('Cấu hình', 'site-url', 'SITE_URL (địa chỉ chính)', String(e.SITE_URL)) : warn('Cấu hình', 'site-url', 'SITE_URL', 'Chưa đặt: sitemap, canonical và JSON-LD sẽ không có địa chỉ tuyệt đối.'));
  checks.push(e.COMING_SOON === '1' ? warn('Cấu hình', 'coming-soon', 'Chế độ "Sắp ra mắt"', 'ĐANG BẬT: khách chỉ thấy trang chờ. Deploy với -Live / --live để mở web thật.') : ok('Cấu hình', 'coming-soon', 'Chế độ "Sắp ra mắt"', 'Đã tắt, web thật đang mở cho khách.'));
  checks.push(e.PREVIEW_DEMO === '1' && e.SITE_URL ? fail('Cấu hình', 'demo', 'PREVIEW_DEMO', 'Đang bật chế độ dữ liệu mẫu trên web có SITE_URL. Không bao giờ dùng cho web thật.') : ok('Cấu hình', 'demo', 'Chế độ dữ liệu mẫu', 'Tắt.'));
  for (const [key, label, severe] of [['ADMIN_PASSWORD', 'Mật khẩu admin', true], ['STAYDESK_CATALOG_SECRET', 'Secret Staydesk', true], ['STAYDESK_CATALOG_URL', 'Địa chỉ Staydesk', false], ['TELEGRAM_BOT_TOKEN', 'Token Telegram', false], ['TELEGRAM_CHAT_ID', 'Chat ID Telegram', false]] as const)
    checks.push(e[key] ? ok('Cấu hình', key, label, 'Đã đặt.') : (severe ? fail : warn)('Cấu hình', key, label, 'Chưa đặt.'));

  // 2. Database + migrations
  if (!env.DB) return [...checks, fail('Database', 'db', 'D1', 'Không có binding DB.')];
  try {
    const applied = await env.DB.prepare('SELECT name FROM d1_migrations').all<{ name: string }>();
    const missing = pendingMigrations((applied.results || []).map(row => row.name));
    checks.push(missing.length ? fail('Database', 'migrations', 'Migration', `Chưa áp dụng: ${missing.join(', ')}. Chạy deploy với -Migrate (Windows) hoặc --migrate (Mac).`) : ok('Database', 'migrations', 'Migration', 'Đã áp dụng đủ.'));
  } catch (error) { checks.push(fail('Database', 'migrations', 'Migration', reason(error))); }

  // 3. Staydesk
  try {
    const source = await getFreshStaydeskCatalog();
    const rooms = source.buildings.reduce((sum, building) => sum + building.rooms.length, 0);
    checks.push(ok('Staydesk', 'staydesk', 'Kết nối Staydesk', `${source.buildings.length} tòa, ${rooms} phòng.`));
  } catch (error) { checks.push(fail('Staydesk', 'staydesk', 'Kết nối Staydesk', reason(error))); }

  // 4. The catalog visitors see (the page hides the real error, so show it here)
  try {
    const catalog = await getPublicCatalog(undefined, undefined, 'vi');
    checks.push(catalog.buildings.length ? ok('Trang công khai', 'catalog', 'Danh sách tòa cho khách', `${catalog.buildings.length} tòa đang hiển thị.`) : warn('Trang công khai', 'catalog', 'Danh sách tòa cho khách', 'Không có tòa nào được bật "Hiển thị cho khách".'));
    for (const building of catalog.buildings) {
      const name = building.name, photos = buildingPhotos(building).length, price = buildingFromPrice(building), rooms = buildingRoomCount(building);
      checks.push(photos ? ok('Tòa nhà', `photos-${building.id}`, `${name}: ảnh`, `${photos} ảnh dùng được (tòa, loại phòng, phòng).`) : warn('Tòa nhà', `photos-${building.id}`, `${name}: ảnh`, 'Chưa có ảnh nào: trang chủ và thẻ tòa sẽ trống.'));
      checks.push(building.address ? ok('Tòa nhà', `address-${building.id}`, `${name}: địa chỉ`, building.address) : warn('Tòa nhà', `address-${building.id}`, `${name}: địa chỉ`, 'Chưa nhập địa chỉ.'));
      checks.push(building.latitude !== null && building.longitude !== null ? ok('Tòa nhà', `geo-${building.id}`, `${name}: toạ độ`, 'Có.') : warn('Tòa nhà', `geo-${building.id}`, `${name}: toạ độ`, 'Chưa có: tòa không hiện trên bản đồ.'));
      checks.push(rooms && price ? ok('Tòa nhà', `rooms-${building.id}`, `${name}: phòng và giá`, `${rooms} phòng, từ ${price.toLocaleString('vi-VN')} ₫.`) : warn('Tòa nhà', `rooms-${building.id}`, `${name}: phòng và giá`, `${rooms} phòng hiển thị${price ? '' : ', chưa có giá'}.`));
    }
  } catch (error) { checks.push(fail('Trang công khai', 'catalog', 'Danh sách tòa cho khách', `LỖI (khách sẽ thấy "chưa sẵn sàng"): ${reason(error)}`)); }

  // 5. Photos really exist in storage
  if (!env.BUCKET) checks.push(fail('Kho ảnh', 'r2', 'R2', 'Không có binding BUCKET.'));
  else {
    try {
      const sample = await env.DB.prepare('SELECT id, object_key FROM catalog_images ORDER BY RANDOM() LIMIT 15').all<{ id: string; object_key: string }>();
      const lost: string[] = [];
      for (const row of sample.results || []) if (!(await env.BUCKET.head(row.object_key))) lost.push(row.id.slice(0, 8));
      checks.push(lost.length ? fail('Kho ảnh', 'r2', 'Ảnh trong kho', `${lost.length}/${(sample.results || []).length} ảnh mẫu có trong danh sách nhưng thiếu file: ${lost.join(', ')}`) : ok('Kho ảnh', 'r2', 'Ảnh trong kho', `${(sample.results || []).length} ảnh mẫu đều có file.`));
    } catch (error) { checks.push(fail('Kho ảnh', 'r2', 'Ảnh trong kho', reason(error))); }
  }

  // 6. Alerts
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM catalog_inquiries WHERE telegram_status = 'failed' AND created_at > datetime('now', '-30 days')").first<{ n: number }>();
    checks.push((row?.n || 0) > 0 ? warn('Yêu cầu khách', 'telegram', 'Báo Telegram', `${row!.n} yêu cầu trong 30 ngày qua gửi Telegram thất bại: xem Guest contacts và liên hệ khách trực tiếp.`) : ok('Yêu cầu khách', 'telegram', 'Báo Telegram', 'Không có yêu cầu nào bị lỗi gửi.'));
  } catch (error) { checks.push(warn('Yêu cầu khách', 'telegram', 'Báo Telegram', reason(error))); }
  return checks;
}
