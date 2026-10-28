import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/images/route";
import { isAdmin } from "@/lib/admin";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN } from "./helpers/fixtures";

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(async () => true),
  validOrigin: (request: Request) => request.headers.get("origin") === new URL(request.url).origin,
}));

resetEnvBeforeEach();

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]);

function adminRequest(fields: Record<string, string | File>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new NextRequest(`${ORIGIN}/api/admin/images`, { method: "POST", headers: { origin: ORIGIN, ...headers }, body: form });
}
const image = (bytes: Uint8Array, type = "image/png") => new File([bytes as BlobPart], "room.png", { type });

function makeBucket() {
  return { put: vi.fn<(key: string, body: Uint8Array, options?: unknown) => Promise<unknown>>(async () => ({})), delete: vi.fn<(key: string) => Promise<void>>(async () => {}) };
}

beforeEach(() => { vi.mocked(isAdmin).mockResolvedValue(true); });

describe("POST /api/admin/images", () => {
  describe("access", () => {
    it("returns 403 for non-admins", async () => {
      vi.mocked(isAdmin).mockResolvedValue(false);
      setEnv({ DB: createD1().db });
      expect((await POST(adminRequest({ roomId: "1" }))).status).toBe(403);
    });
    it("returns 403 for a foreign origin", async () => {
      setEnv({ DB: createD1().db });
      expect((await POST(adminRequest({ roomId: "1" }, { origin: "https://evil.test" }))).status).toBe(403);
    });
    it("returns 503 without a database", async () => {
      expect((await POST(adminRequest({ roomId: "1" }))).status).toBe(503);
    });
    it("returns 413 when content-length is over 2 MB", async () => {
      setEnv({ DB: createD1().db });
      expect((await POST(adminRequest({ roomId: "1" }, { "content-length": "2000001" }))).status).toBe(413);
    });
  });

  describe("room validation", () => {
    it.each(["abc", "0", "-1", "1.5"])("rejects roomId %j", async (roomId) => {
      setEnv({ DB: createD1().db });
      expect((await POST(adminRequest({ roomId }))).status).toBe(400);
    });
    it("rejects an unknown, non-custom room", async () => {
      const d1 = createD1([[/FROM room_details/, { first: null }]]);
      setEnv({ DB: d1.db });
      expect((await POST(adminRequest({ roomId: "999", action: "upload" }))).status).toBe(400);
    });
    it("accepts a custom room found in room_details", async () => {
      const d1 = createD1([[/FROM room_details/, { first: { id: 50 } }], [/COUNT\(\*\)/, { first: { total: 0 } }]]);
      setEnv({ DB: d1.db });
      const response = await POST(adminRequest({ roomId: "50", action: "upload", image: image(PNG) }));
      expect(response.status).toBe(303);
    });
    it("rejects an unknown action", async () => {
      setEnv({ DB: createD1().db });
      const response = await POST(adminRequest({ roomId: "1", action: "explode" }));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Invalid action");
    });
  });

  describe("upload", () => {
    it("stores a PNG as base64 in D1 when there is no BUCKET", async () => {
      const d1 = createD1([[/COUNT\(\*\)/, { first: { total: 2 } }]]);
      setEnv({ DB: d1.db });
      const response = await POST(adminRequest({ roomId: "1", alt: "  Living room  ", image: image(PNG) }));
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/admin/rooms#room-1`);
      const [insert] = d1.sqlCalls(/INSERT INTO room_images/);
      expect(insert.args).toEqual([1, "image/png", btoa(String.fromCharCode(...PNG)), "Living room", 2, null]);
    });

    it("stores the file in R2 and only the key in D1 when BUCKET is bound", async () => {
      const bucket = makeBucket();
      const d1 = createD1([[/COUNT\(\*\)/, { first: { total: 0 } }]]);
      setEnv({ DB: d1.db, BUCKET: bucket });
      const response = await POST(adminRequest({ roomId: "2", image: image(JPEG, "image/jpeg") }));
      expect(response.status).toBe(303);
      expect(bucket.put).toHaveBeenCalledTimes(1);
      const [key, , options] = bucket.put.mock.calls[0] as [string, Uint8Array, { httpMetadata: { contentType: string } }];
      expect(key).toMatch(/^rooms\/2\/[0-9a-f-]{36}$/);
      expect(options.httpMetadata.contentType).toBe("image/jpeg");
      const [insert] = d1.sqlCalls(/INSERT INTO room_images/);
      expect(insert.args[2]).toBe("");
      expect(insert.args[5]).toBe(key);
    });

    it("removes the R2 object if the D1 insert fails", async () => {
      const bucket = makeBucket();
      const d1 = createD1([[/COUNT\(\*\)/, { first: { total: 0 } }]]);
      const failing = { ...d1.db, prepare: (sql: string) => {
        const statement = d1.db.prepare(sql);
        return /INSERT INTO room_images/.test(sql) ? { bind: () => ({ run: async () => { throw new Error("D1 down"); } }) } : statement;
      } };
      setEnv({ DB: failing, BUCKET: bucket });
      await expect(POST(adminRequest({ roomId: "1", image: image(WEBP, "image/webp") }))).rejects.toThrow("D1 down");
      expect(bucket.delete).toHaveBeenCalledWith(bucket.put.mock.calls[0][0]);
    });

    it.each([
      ["missing file", {}],
      ["gif type", { image: image(PNG, "image/gif") }],
      ["empty file", { image: image(new Uint8Array(0)) }],
      ["file over 900 KB", { image: image(new Uint8Array(900_001)) }],
    ])("rejects %s with 400", async (_label, extra) => {
      const d1 = createD1();
      setEnv({ DB: d1.db });
      const response = await POST(adminRequest({ roomId: "1", ...extra }));
      expect(response.status).toBe(400);
      expect(await response.text()).toContain("JPG, PNG, or WebP");
      expect(d1.sqlCalls(/INSERT INTO room_images/)).toHaveLength(0);
    });

    it("rejects files whose bytes do not match the declared type", async () => {
      const d1 = createD1();
      setEnv({ DB: d1.db });
      for (const [bytes, type] of [[JPEG, "image/png"], [PNG, "image/jpeg"], [PNG, "image/webp"]] as const) {
        const response = await POST(adminRequest({ roomId: "1", image: image(bytes, type) }));
        expect(response.status).toBe(400);
        expect(await response.text()).toBe("Invalid image file");
      }
      expect(d1.sqlCalls(/INSERT INTO room_images/)).toHaveLength(0);
    });

    it("enforces the 12-image limit per room", async () => {
      const bucket = makeBucket();
      const d1 = createD1([[/COUNT\(\*\)/, { first: { total: 12 } }]]);
      setEnv({ DB: d1.db, BUCKET: bucket });
      const response = await POST(adminRequest({ roomId: "1", image: image(PNG) }));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Maximum 12 images per room");
      expect(bucket.put).not.toHaveBeenCalled();
    });
  });

  describe("manage existing images", () => {
    const current = { id: 20, position: 1, r2_key: null as string | null };
    const setup = (row: typeof current | null = current, order = [10, 20, 30], bucket = makeBucket()) => {
      const d1 = createD1([
        [/SELECT id, position, r2_key FROM room_images/, { first: row }],
        [/SELECT id FROM room_images WHERE apartment_id/, { all: order.map(id => ({ id })) }],
      ]);
      setEnv({ DB: d1.db, BUCKET: bucket });
      return { d1, bucket };
    };
    const positions = (d1: ReturnType<typeof createD1>) => d1.sqlCalls(/UPDATE room_images SET position/).map(call => [call.args[1], call.args[0]]);

    it("returns 404 for an image that is not in the room", async () => {
      setup(null);
      expect((await POST(adminRequest({ roomId: "1", action: "delete", imageId: "99" }))).status).toBe(404);
    });

    it("deletes a D1-stored image without touching R2", async () => {
      const { d1, bucket } = setup();
      const response = await POST(adminRequest({ roomId: "1", action: "delete", imageId: "20" }));
      expect(response.status).toBe(303);
      expect(d1.sqlCalls(/DELETE FROM room_images/)[0].args).toEqual([20, 1]);
      expect(bucket.delete).not.toHaveBeenCalled();
    });

    it("deletes the R2 object together with the row", async () => {
      const { bucket } = setup({ ...current, r2_key: "rooms/1/xyz" });
      await POST(adminRequest({ roomId: "1", action: "delete", imageId: "20" }));
      expect(bucket.delete).toHaveBeenCalledWith("rooms/1/xyz");
    });

    it("moves an image up", async () => {
      const { d1 } = setup();
      await POST(adminRequest({ roomId: "1", action: "up", imageId: "20" }));
      expect(positions(d1)).toEqual([[20, 0], [10, 1], [30, 2]]);
    });

    it("moves an image down", async () => {
      const { d1 } = setup();
      await POST(adminRequest({ roomId: "1", action: "down", imageId: "20" }));
      expect(positions(d1)).toEqual([[10, 0], [30, 1], [20, 2]]);
    });

    it("keeps the order when moving the first image up", async () => {
      const { d1 } = setup({ ...current, id: 10 });
      await POST(adminRequest({ roomId: "1", action: "up", imageId: "10" }));
      expect(positions(d1)).toEqual([[10, 0], [20, 1], [30, 2]]);
    });

    it("makes an image the cover", async () => {
      const { d1 } = setup({ ...current, id: 30 });
      await POST(adminRequest({ roomId: "1", action: "cover", imageId: "30" }));
      expect(positions(d1)).toEqual([[30, 0], [10, 1], [20, 2]]);
    });
  });
});
