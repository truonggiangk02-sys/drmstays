/**
 * Daily backup of the database into the R2 bucket (key backups/db-YYYY-MM-DD.sql), kept for 14 days.
 * The file is plain SQL: after `wrangler d1 migrations apply` has rebuilt the tables, running it with
 * `wrangler d1 execute DB --remote --file <file>` puts the data back. Photos are not copied (they are large and
 * already stored in R2); a small manifest of their count and size goes next to each backup.
 */
export const BACKUP_PREFIX = 'backups/';
export const KEEP_BACKUPS = 14;
const SKIP_TABLES = /^(sqlite_|_cf_|d1_migrations$)/;

export const backupKey = (date: Date) => `${BACKUP_PREFIX}db-${date.toISOString().slice(0, 10)}.sql`;

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return `X'${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}'`;
  }
  if (Array.isArray(value)) return `X'${value.map(byte => Number(byte).toString(16).padStart(2, '0')).join('')}'`; // D1 returns blobs as byte arrays
  return `'${String(value).replace(/'/g, "''")}'`;
}

const quoteName = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Every table's rows as INSERT OR REPLACE statements, one per row. */
export async function dumpDatabase(db: D1Database, now = new Date()): Promise<{ sql: string; tables: number; rows: number }> {
  const listed = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all<{ name: string }>();
  const names = (listed.results || []).map(row => row.name).filter(name => !SKIP_TABLES.test(name));
  const lines = [`-- DRM Stays database backup, ${now.toISOString()}`, '-- Restore: apply the migrations, then run this file with wrangler d1 execute DB --remote --file <file>'];
  let rows = 0;
  for (const name of names) {
    const table = quoteName(name);
    const pageSize = 2000;
    for (let offset = 0; ; offset += pageSize) {
      const page = await db.prepare(`SELECT * FROM ${table} LIMIT ${pageSize} OFFSET ${offset}`).all<Record<string, unknown>>();
      const chunk = page.results || [];
      for (const row of chunk) {
        const columns = Object.keys(row);
        lines.push(`INSERT OR REPLACE INTO ${table} (${columns.map(quoteName).join(', ')}) VALUES (${columns.map(column => sqlValue(row[column])).join(', ')});`);
        rows++;
      }
      if (chunk.length < pageSize) break;
    }
  }
  return { sql: lines.join('\n') + '\n', tables: names.length, rows };
}

/** Count and total size of the objects in the bucket, outside the backups folder. */
async function bucketManifest(bucket: R2Bucket): Promise<{ objects: number; bytes: number }> {
  let objects = 0, bytes = 0, cursor: string | undefined;
  do {
    const page: R2Objects = await bucket.list({ cursor, limit: 1000 });
    for (const item of page.objects) if (!item.key.startsWith(BACKUP_PREFIX)) { objects++; bytes += item.size; }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return { objects, bytes };
}

/** Writes today's backup and removes the ones beyond the newest KEEP_BACKUPS. */
export async function runBackup(db: D1Database, bucket: R2Bucket, now = new Date()): Promise<{ key: string; rows: number; tables: number; removed: number }> {
  const dump = await dumpDatabase(db, now);
  const key = backupKey(now);
  await bucket.put(key, dump.sql, { httpMetadata: { contentType: 'application/sql' }, customMetadata: { rows: String(dump.rows), tables: String(dump.tables) } });
  const manifest = await bucketManifest(bucket);
  await bucket.put(key.replace(/\.sql$/, '.json'), JSON.stringify({ createdAt: now.toISOString(), tables: dump.tables, rows: dump.rows, photos: manifest }), { httpMetadata: { contentType: 'application/json' } });
  const existing = (await bucket.list({ prefix: `${BACKUP_PREFIX}db-` })).objects.map(item => item.key).filter(name => name.endsWith('.sql')).sort();
  const old = existing.slice(0, Math.max(0, existing.length - KEEP_BACKUPS));
  for (const name of old) await bucket.delete([name, name.replace(/\.sql$/, '.json')]);
  return { key, rows: dump.rows, tables: dump.tables, removed: old.length };
}

/** Date of the newest backup, or null. Used by the health page. */
export async function latestBackup(bucket: R2Bucket): Promise<{ key: string; date: string; rows: number } | null> {
  const listed = await bucket.list({ prefix: `${BACKUP_PREFIX}db-` });
  const newest = listed.objects.filter(item => item.key.endsWith('.sql')).sort((a, b) => a.key.localeCompare(b.key)).at(-1);
  if (!newest) return null;
  const head = await bucket.head(newest.key);
  return { key: newest.key, date: newest.key.slice(-14, -4), rows: Number(head?.customMetadata?.rows || 0) };
}
