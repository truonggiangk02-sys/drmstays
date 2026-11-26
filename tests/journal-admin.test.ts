import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createAdminSession } from "@/lib/admin";
import { fetchPublicImage, publicImageUrl, sniffImage } from "@/lib/journal-images";
import { parsePayload, runJournalAction, type JournalPayload } from "@/lib/journal-admin";
import { REVIEW_ITEMS } from "@/lib/blog-standard";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN } from "./helpers/fixtures";

let cookieValue = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name.endsWith("doraemon_admin") && cookieValue ? { value: cookieValue } : undefined) }),
}));

resetEnvBeforeEach();

const ID = "6f1c2a1e-1111-4222-8333-944455556666";
const IMG1 = "11111111-1111-4111-8111-111111111111";
const IMG2 = "22222222-2222-4222-8222-222222222222";
const ALT = "Quiet lane in An Thuong with apartment buildings and parked motorbikes at dusk";
const KEYWORD = "where to stay in da nang";
const sentence = "The quiet lane keeps the apartment calm at night while the market stays close by foot".split(" ");
const filler = (count: number) => Array.from({ length: count }, (_, i) => sentence[i % sentence.length] + (i % sentence.length === sentence.length - 1 || i === count - 1 ? "." : "")).join(" ");
const answer = filler(40);

const GOOD_BODY = [
  `We think An Thuong is the best answer to ${KEYWORD}, with the beach ten minutes away by bike. ${filler(40)}`,
  "## Key takeaways", "- An Thuong suits long stays.", "- My Khe is nearer the beach.", "- Son Tra is the quietest area.",
  `## Where to stay in Da Nang for a month`, filler(90), `![${ALT}](/media/catalog/${IMG1})`, `Read our [monthly rent guide](https://drmstays.vn/en/monthly-rent) first. ${filler(80)}`,
  "## How the areas differ", filler(100), filler(100), `![${ALT}](/media/catalog/${IMG2})`,
  "## Who each area suits", filler(100), filler(100), filler(100), filler(100),
  "## Frequently asked questions", "### Is An Thuong good for a long stay?", answer, "### Is the beach close by?", answer, "### Can I rent for one month?", answer,
  "## Next step", "Ready to see rooms? [Contact us](/en/contact) today.",
].join("\n\n");

const payload = (over: Partial<JournalPayload> = {}): JournalPayload => ({
  id: ID, action: "save", h1: "Where to Stay in Da Nang: Best Areas Compared by Local Hosts", seoTitle: "Where to Stay in Da Nang: Best Areas",
  meta: "An Thuong, My Khe, Hai Chau or Son Tra? A local host compares four Da Nang areas by price, beach distance and noise, with real walking times.",
  slug: "where-to-stay-da-nang", keyword: KEYWORD, variations: "best area to stay in da nang", intent: "informational", template: "A", level: "B", topic: "area", authorId: "author-1", date: "2026-12-01",
  body: GOOD_BODY, coverAlt: ALT, titleVi: "", metaVi: "", bodyVi: "", reviews: [], confirmSlugChange: false, ...over,
});
const ticked = REVIEW_ITEMS.map(() => true);

type Stored = { id: string; status: string; published: number; slug: string; published_at: string; checked_at: string; position: number } | null;

/** A D1 fake that behaves like the table for what the journal actions read and write. */
function setup(stored: Stored = null, opts: { cover?: number; author?: boolean; takenSlugs?: string[]; failWrite?: boolean } = {}) {
  let row = stored;
  const d1 = createD1([
    [/SELECT id, status, published, slug, published_at, checked_at, position FROM site_content_items/, () => ({ first: row })],
    [/SELECT 1 FROM authors/, () => ({ first: opts.author === false ? null : { 1: 1 } })],
    [/COUNT\(\*\) AS n FROM catalog_images/, () => ({ first: { n: opts.cover ?? 1 } })],
    [/SELECT 1 FROM site_content_items WHERE slug/, args => ({ first: (opts.takenSlugs || []).includes(String(args[0])) ? { 1: 1 } : null })],
    [/COALESCE\(MAX\(position\)/, () => ({ first: { n: 7 } })],
    [/SELECT id, title_vi, title_en/, () => ({ all: [] })],
    [/INSERT INTO site_content_items/, (args, sql) => {
      if (opts.failWrite) throw new Error("no such column");
      const names = /\(id, section, ([^)]*)\) VALUES/.exec(sql)![1].split(", ");
      const values = Object.fromEntries(names.map((name, index) => [name, args[index + 1]]));
      row = { id: String(args[0]), status: String(values.status), published: Number(values.published), slug: String(values.slug), published_at: String(values.published_at), checked_at: String(values.checked_at ?? row?.checked_at ?? ""), position: Number(values.position) };
      return { run: {} };
    }],
    [/UPDATE site_content_items SET (status|deleted)/, (args, sql) => { if (row) { if (/deleted = 1/.test(sql)) row = null; else row = { ...row, status: String(args[0]), published: 0 }; } return { run: {} }; }],
  ]);
  setEnv({ DB: d1.db });
  return { d1, row: () => row, writes: () => d1.sqlCalls(/INSERT INTO site_content_items/), redirects: () => d1.sqlCalls(/journal_redirects/) };
}
const NOW = new Date("2026-11-25T10:00:00Z");
const run = (over: Partial<JournalPayload> = {}) => runJournalAction(payload(over), NOW);

describe("saving a draft", () => {
  it("is always allowed, even for a post that breaks the standard", async () => {
    const t = setup();
    const result = await run({ h1: "short", body: "", keyword: "" });
    expect(result).toMatchObject({ ok: true, status: "draft" });
    expect(t.row()?.status).toBe("draft");
    expect(t.row()?.published).toBe(0);
  });

  it("gives a taken address a number instead of failing", async () => {
    setup(null, { takenSlugs: ["where-to-stay-da-nang"] });
    expect(await run()).toMatchObject({ ok: true, slug: "where-to-stay-da-nang-2" });
  });

  it("returns the check results so the editor can show them", async () => {
    setup();
    const result = await run();
    expect(result.ok && result.checks.length).toBeGreaterThan(20);
  });

  it("only stores known choices and a real author", async () => {
    const t = setup(null, { author: false });
    await run({ template: "Z", topic: "nonsense" });
    const args = t.writes()[0].args;
    expect(args).not.toContain("Z");
    expect(args).not.toContain("nonsense");
    expect(args).not.toContain("author-1");
  });

  it("binds every value; the request never reaches the SQL text", async () => {
    const t = setup();
    await run({ h1: "x'); DROP TABLE site_content_items; --", slug: "a b" });
    expect(t.writes()[0].sql).not.toContain("DROP TABLE");
  });

  it("explains a database without the new columns", async () => {
    setup(null, { failWrite: true });
    expect(await run()).toMatchObject({ ok: false, code: 409 });
  });
});

describe("marking ready", () => {
  it("works for a post that meets the standard", async () => {
    const t = setup();
    expect(await run({ action: "ready" })).toMatchObject({ ok: true, status: "ready" });
    expect(t.row()?.status).toBe("ready");
  });

  it("is refused while a blocking rule fails, and says which", async () => {
    const t = setup();
    const result = await run({ action: "ready", h1: "short" });
    expect(result).toMatchObject({ ok: false, code: 422 });
    expect(!result.ok && result.checks?.some(check => check.code === "R01" && check.level === "block")).toBe(true);
    expect(t.writes()).toHaveLength(0);
  });

  it("is refused when there is no cover photo", async () => {
    setup(null, { cover: 0 });
    const result = await run({ action: "ready" });
    expect(!result.ok && result.checks?.some(check => check.code === "R14")).toBe(true);
  });
});

describe("publishing", () => {
  const ready = (): Stored => ({ id: ID, status: "ready", published: 0, slug: "where-to-stay-da-nang", published_at: "2026-12-01", checked_at: "", position: 3 });

  it("needs the post to be marked ready first", async () => {
    setup();
    expect(await run({ action: "publish", reviews: ticked })).toMatchObject({ ok: false, code: 400 });
  });

  it("needs all six boxes ticked", async () => {
    const t = setup(ready());
    expect(await run({ action: "publish", reviews: ticked.map((_, i) => i !== 3) })).toMatchObject({ ok: false, code: 422 });
    expect(await run({ action: "publish", reviews: [] })).toMatchObject({ ok: false, code: 422 });
    expect(t.writes()).toHaveLength(0);
  });

  it("still refuses a post with a blocking rule even when everything is ticked", async () => {
    setup(ready());
    expect(await run({ action: "publish", reviews: ticked, body: GOOD_BODY + "\n\n[NEEDS INPUT: price]" })).toMatchObject({ ok: false, code: 422 });
  });

  it("publishes: live, who checked and when, the chosen date kept", async () => {
    const t = setup(ready());
    const result = await run({ action: "publish", reviews: ticked });
    expect(result).toMatchObject({ ok: true, status: "published", updatedAt: "2026-12-01" });
    expect(t.row()).toMatchObject({ status: "published", published: 1, published_at: "2026-12-01" });
    const args = t.writes()[0].args;
    expect(args).toContain("admin");
    expect(args).toContain("2026-11-25T10:00:00.000Z");
    expect(args).toContain(JSON.stringify(ticked));
  });
});

describe("a post that is live", () => {
  const live = (): Stored => ({ id: ID, status: "published", published: 1, slug: "where-to-stay-da-nang", published_at: "2026-11-01", checked_at: "2026-11-01T00:00:00.000Z", position: 3 });

  it("cannot be saved as a draft; it is updated or taken down", async () => {
    setup(live());
    expect(await run({ action: "save" })).toMatchObject({ ok: false, code: 400 });
  });

  it("updates with the checks run again and the 'updated' date moved", async () => {
    const t = setup(live());
    expect(await run({ action: "update", date: "2026-11-01" })).toMatchObject({ ok: true, status: "published", updatedAt: "2026-11-25" });
    expect(t.row()?.published).toBe(1);
    expect(await run({ action: "update", date: "2026-11-01", h1: "short" })).toMatchObject({ ok: false, code: 422 });
  });

  it("does not change the address without a confirmation, then leaves a redirect from the old one", async () => {
    const t = setup(live());
    expect(await run({ action: "update", slug: "best-areas-in-da-nang" })).toMatchObject({ ok: false, code: 409 });
    expect(t.writes()).toHaveLength(0);
    expect(await run({ action: "update", slug: "best-areas-in-da-nang", confirmSlugChange: true })).toMatchObject({ ok: true, slug: "best-areas-in-da-nang" });
    expect(t.redirects().some(call => call.sql.includes("INSERT OR REPLACE") && call.args[0] === "where-to-stay-da-nang" && call.args[1] === ID)).toBe(true);
  });

  it("takes down to a draft", async () => {
    const t = setup(live());
    expect(await run({ action: "unpublish" })).toMatchObject({ ok: true, status: "draft" });
    expect(t.row()).toMatchObject({ status: "draft", published: 0 });
  });
});

describe("archive and delete", () => {
  it("archives, restores and deletes a draft", async () => {
    const t = setup({ id: ID, status: "draft", published: 0, slug: "x-y-z", published_at: "", checked_at: "", position: 1 });
    expect(await run({ action: "archive" })).toMatchObject({ ok: true, status: "archived" });
    expect(await run({ action: "save" })).toMatchObject({ ok: false, code: 400 }); // archived: restore first
    expect(await run({ action: "unarchive" })).toMatchObject({ ok: true, status: "draft" });
    expect(await run({ action: "delete" })).toMatchObject({ ok: true, status: "deleted" });
    expect(t.row()).toBeNull();
  });

  it("will not delete a live post", async () => {
    setup({ id: ID, status: "published", published: 1, slug: "x-y-z", published_at: "", checked_at: "", position: 1 });
    expect(await run({ action: "delete" })).toMatchObject({ ok: false, code: 400 });
  });

  it("answers 404 for a post that does not exist", async () => {
    setup(null);
    expect(await run({ action: "unpublish" })).toMatchObject({ ok: false, code: 404 });
  });
});

describe("what the editor sends", () => {
  it("is read safely", () => {
    expect(parsePayload(null)).toBeNull();
    expect(parsePayload({ id: "nope", action: "save" })).toBeNull();
    expect(parsePayload({ id: ID, action: "explode" })).toBeNull();
    const parsed = parsePayload({ id: ID, action: "save", h1: "  A title  ", keyword: "Where To Stay", reviews: [true, "yes", false], body: 5 })!;
    expect(parsed.h1).toBe("A title");
    expect(parsed.keyword).toBe("where to stay");
    expect(parsed.reviews).toEqual([true, false, false]);
    expect(parsed.body).toBe("");
  });
});

describe("the journal API routes", () => {
  let route: (request: NextRequest) => Promise<Response>;
  beforeEach(async () => {
    setup();
    setEnv({ ADMIN_PASSWORD: "pw-for-tests" });
    cookieValue = (await createAdminSession()).value;
    route = (await import("@/app/api/admin/journal/route")).POST;
  });
  const post = (body: unknown, headers: Record<string, string> = { origin: ORIGIN }) => route(new NextRequest(`${ORIGIN}/api/admin/journal`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));

  it("saves a draft for an admin", async () => {
    const response = await post(payload());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: "draft" });
  });

  it("answers 422 with the failed rules when a blocked post is marked ready", async () => {
    const response = await post(payload({ action: "ready", h1: "short" }));
    expect(response.status).toBe(422);
    const data = await response.json() as { error: string; checks: Array<{ code: string }> };
    expect(data.checks.some(check => check.code === "R01")).toBe(true);
  });

  it("rejects bad JSON and a visitor", async () => {
    expect((await post("not json")).status).toBe(400);
    cookieValue = "";
    expect((await post(payload())).status).toBe(403);
  });
});

describe("copying a picture from another website", () => {
  it("only accepts https addresses of public websites", () => {
    for (const bad of ["http://example.com/a.jpg", "https://127.0.0.1/a.jpg", "https://localhost/a.jpg", "https://[::1]/a.jpg", "https://2130706433/a.jpg", "https://10.0.0.1/a.jpg", "https://printer.local/a.jpg", "https://intranet/a.jpg", "https://user:pw@example.com/a.jpg", "https://example.com:8443/a.jpg", "ftp://example.com/a.jpg", "javascript:alert(1)", "https://metadata.internal/a.jpg", "not a url"]) expect(publicImageUrl(bad), bad).toBeNull();
    expect(publicImageUrl("https://cdn.example.com/a.jpg?w=1200")?.hostname).toBe("cdn.example.com");
  });

  const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0, 0, 2, 8, 6, 0, 0, 0]);

  it("downloads a picture and knows its real type", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PNG, { status: 200 })));
    const result = await fetchPublicImage("https://cdn.example.com/a.png");
    expect(result.ok && sniffImage(result.bytes)).toBe("image/png");
  });

  it("checks every redirect again", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: URL) => { calls.push(String(url)); return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/secret" } }); }));
    expect(await fetchPublicImage("https://cdn.example.com/a.png")).toMatchObject({ ok: false });
    expect(calls).toEqual(["https://cdn.example.com/a.png"]);
  });

  it("refuses a picture that is too large", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(2000), { status: 200 })));
    expect(await fetchPublicImage("https://cdn.example.com/big.png", 1000)).toMatchObject({ ok: false });
  });

  it("judges a file by its bytes, not by what the browser says", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<?php echo 1;"))).toBeNull();
  });
});
