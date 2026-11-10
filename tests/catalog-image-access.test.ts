import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/media/catalog/[id]/route";
import { GET as legacyGet } from "@/app/api/catalog-images/[id]/route";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

vi.mock("@/lib/admin", () => ({ isAdmin: async () => false }));
resetEnvBeforeEach();

const ID = "11111111-2222-4333-8444-555555555555";
const bucket = { get: vi.fn(async () => ({ body: "img", httpEtag: '"abc"' })) };

function setup(visibleRoomType: boolean) {
  const d1 = createD1([
    [/FROM catalog_images WHERE id/, { first: { object_key: "k", mime: "image/jpeg", owner_type: "roomtype", owner_id: "t1" } }],
    [/FROM catalog_room_types t JOIN catalog_buildings b/, { first: visibleRoomType ? { 1: 1 } : null }],
  ]);
  setEnv({ DB: d1.db, BUCKET: bucket });
}
const call = (headers: Record<string, string> = {}) => GET(new Request(`https://x.test/media/catalog/${ID}`, { headers }), { params: Promise.resolve({ id: ID }) });

beforeEach(() => bucket.get.mockClear());

describe("GET /media/catalog/[id] for room types", () => {
  it("serves a photo of a published room type in a published building", async () => {
    setup(true);
    expect((await call()).status).toBe(200);
  });
  it("lets browsers keep a published photo for a long time and answers revalidation with 304", async () => {
    setup(true);
    const first = await call();
    expect(first.headers.get("cache-control")).toBe("public, max-age=2592000, immutable");
    expect(first.headers.get("etag")).toBe('"abc"');
    expect((await call({ "if-none-match": '"abc"' })).status).toBe(304);
  });
  it("hides it when the room type or its building is not published", async () => {
    setup(false);
    expect((await call()).status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });
});

describe("GET /api/catalog-images/[id] (old address)", () => {
  it("redirects permanently to the public address without touching storage", async () => {
    setup(true);
    const response = await legacyGet(new Request(`https://x.test/api/catalog-images/${ID}`), { params: Promise.resolve({ id: ID }) });
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`/media/catalog/${ID}`);
    expect(bucket.get).not.toHaveBeenCalled();
  });
  it("404s for an id that is not an image id", async () => {
    const response = await legacyGet(new Request("https://x.test/api/catalog-images/nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(response.status).toBe(404);
  });
});
