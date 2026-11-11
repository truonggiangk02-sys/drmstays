import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_MIGRATIONS, pendingMigrations } from "@/lib/migrations";

describe("migrations list", () => {
  it("matches the files in drizzle/", () => {
    const files = readdirSync(join(__dirname, "..", "drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).map(name => name.replace(/\.sql$/, "")).sort();
    expect([...EXPECTED_MIGRATIONS]).toEqual(files);
  });
  it("reports what the database has not applied yet", () => {
    const applied = EXPECTED_MIGRATIONS.slice(0, 13).map(name => `${name}.sql`);
    expect(pendingMigrations(applied)).toEqual(["0013_room_types", "0014_seo_foundation"]);
    expect(pendingMigrations(EXPECTED_MIGRATIONS.map(name => `${name}.sql`))).toEqual([]);
  });
});
