import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/catalog-images/[id]/route";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

vi.mock("@/lib/admin", () => ({ isAdmin: async () => false }));
resetEnvBeforeEach();

const ID = "11111111-2222-4333-8444-555555555555";
const bucket = { get: vi.fn(async () => ({ body: "img" })) };

function setup(visibleRoomType: boolean) {
  const d1 = createD1([
    [/FROM catalog_images WHERE id/, { first: { object_key: "k", mime: "image/jpeg", owner_type: "roomtype", owner_id: "t1" } }],
    [/FROM catalog_room_types t JOIN catalog_buildings b/, { first: visibleRoomType ? { 1: 1 } : null }],
  ]);
  setEnv({ DB: d1.db, BUCKET: bucket });
}
const call = () => GET(new Request(`https://x.test/api/catalog-images/${ID}`), { params: Promise.resolve({ id: ID }) });

beforeEach(() => bucket.get.mockClear());

describe("GET /api/catalog-images/[id] for room types", () => {
  it("serves a photo of a published room type in a published building", async () => {
    setup(true);
    expect((await call()).status).toBe(200);
  });
  it("hides it when the room type or its building is not published", async () => {
    setup(false);
    expect((await call()).status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });
});
