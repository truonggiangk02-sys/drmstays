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
    expect(pendingMigrations(applied)).toEqual(["0013_room_types", "0014_seo_foundation", "0015_home_content", "0016_social_links", "0017_image_area", "0018_inquiry_notes", "0019_journal_posts", "0020_journal_standard", "0021_authors"]);
    expect(pendingMigrations(EXPECTED_MIGRATIONS.map(name => `${name}.sql`))).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
describe("migration 0021", () => {
  const sql = readFileSync(join(__dirname, "..", "drizzle", "0021_authors.sql"), "utf8");
  it("adds the company's marketing team as the first author, safe to run twice", () => {
    expect(sql).toMatch(/INSERT OR IGNORE INTO authors[^;]*'DRM Stays Marketing Team'[^;]*'team'\)/);
    expect(/VALUES \('([0-9a-f-]{36})'/.exec(sql)?.[1]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
