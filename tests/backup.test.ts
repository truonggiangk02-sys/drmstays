import { describe, expect, it } from "vitest";
import { BACKUP_PREFIX, KEEP_BACKUPS, backupKey, dumpDatabase, latestBackup, runBackup } from "@/lib/backup";
import { createD1 } from "./helpers/d1";

function fakeBucket(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial).map(([key, value]) => [key, { value, meta: {} as Record<string, string> }]));
  return {
    store,
    put: async (key: string, value: string, options?: { customMetadata?: Record<string, string> }) => { store.set(key, { value, meta: options?.customMetadata || {} }); },
    delete: async (keys: string | string[]) => { for (const key of ([] as string[]).concat(keys)) store.delete(key); },
    head: async (key: string) => (store.has(key) ? { customMetadata: store.get(key)!.meta } : null),
    list: async (options: { prefix?: string } = {}) => ({ objects: [...store.entries()].filter(([key]) => key.startsWith(options.prefix || "")).map(([key, item]) => ({ key, size: item.value.length })), truncated: false, cursor: "" }),
  };
}
const asBucket = (bucket: ReturnType<typeof fakeBucket>) => bucket as unknown as R2Bucket;
const NOW = new Date("2026-11-20T20:00:00Z");

const db = () => createD1([
  [/FROM sqlite_master/, { all: [{ name: "catalog_inquiries" }, { name: "d1_migrations" }, { name: "sqlite_sequence" }, { name: "weird\"name" }] }],
  [/FROM "catalog_inquiries"/, { all: [{ id: "a1", name: "O'Brien", phone: "0912", note: null, n: 3, blob: [1, 255] }] }],
  [/FROM "weird""name"/, { all: [] }],
]);

describe("dumpDatabase", () => {
  it("writes one INSERT OR REPLACE per row, quotes text and skips internal tables", async () => {
    const dump = await dumpDatabase(db().db as unknown as D1Database, NOW);
    expect(dump.tables).toBe(2);
    expect(dump.rows).toBe(1);
    expect(dump.sql).toContain(`INSERT OR REPLACE INTO "catalog_inquiries" ("id", "name", "phone", "note", "n", "blob") VALUES ('a1', 'O''Brien', '0912', NULL, 3, X'01ff');`);
    expect(dump.sql).not.toContain("d1_migrations");
    expect(dump.sql).not.toContain("sqlite_sequence");
  });

  it("reads big tables in pages", async () => {
    const full = Array.from({ length: 2000 }, (_, i) => ({ id: i }));
    const d1 = createD1([[/FROM sqlite_master/, { all: [{ name: "t" }] }], [/FROM "t" LIMIT 2000 OFFSET 0/, { all: full }], [/FROM "t" LIMIT 2000 OFFSET 2000/, { all: [{ id: 500 }] }]]);
    const dump = await dumpDatabase(d1.db as unknown as D1Database, NOW);
    expect(dump.rows).toBe(2001);
  });
});

describe("runBackup", () => {
  it("stores the dump with a manifest and keeps only the newest 14", async () => {
    const old = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`${BACKUP_PREFIX}db-2026-11-${String(i + 1).padStart(2, "0")}.sql`, "x"]));
    const bucket = fakeBucket({ ...old, "photos/a.jpg": "12345" });
    const result = await runBackup(db().db as unknown as D1Database, asBucket(bucket), NOW);
    expect(result.key).toBe(backupKey(NOW));
    expect(bucket.store.has(`${BACKUP_PREFIX}db-2026-11-20.sql`)).toBe(true);
    const manifest = JSON.parse(bucket.store.get(`${BACKUP_PREFIX}db-2026-11-20.json`)!.value);
    expect(manifest.photos).toEqual({ objects: 1, bytes: 5 });
    const kept = [...bucket.store.keys()].filter(key => key.endsWith(".sql"));
    expect(kept).toHaveLength(KEEP_BACKUPS);
    expect(kept).not.toContain(`${BACKUP_PREFIX}db-2026-11-01.sql`);
    expect(bucket.store.has("photos/a.jpg")).toBe(true);
  });

  it("reports the newest backup", async () => {
    const bucket = fakeBucket();
    expect(await latestBackup(asBucket(bucket))).toBeNull();
    await runBackup(db().db as unknown as D1Database, asBucket(bucket), NOW);
    expect(await latestBackup(asBucket(bucket))).toMatchObject({ date: "2026-11-20", rows: 1 });
  });
});
