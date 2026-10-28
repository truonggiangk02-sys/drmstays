import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/room-images/[id]/route";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN } from "./helpers/fixtures";

resetEnvBeforeEach();

const get = (id: string) => GET(new NextRequest(`${ORIGIN}/api/room-images/${id}`), { params: Promise.resolve({ id }) });
const withRow = (row: Record<string, unknown> | null) => createD1([[/SELECT mime, image_data, r2_key FROM room_images/, { first: row }]]);

describe("GET /api/room-images/[id]", () => {
  it("returns 404 without a database", async () => {
    expect((await get("1")).status).toBe(404);
  });

  it.each(["abc", "0", "-3", "1.5", ""])("returns 404 for invalid id %j without querying", async (id) => {
    const d1 = withRow({ mime: "image/png", image_data: "", r2_key: null });
    setEnv({ DB: d1.db });
    expect((await get(id)).status).toBe(404);
    expect(d1.calls).toHaveLength(0);
  });

  it("returns 404 when the image does not exist", async () => {
    const d1 = withRow(null);
    setEnv({ DB: d1.db });
    expect((await get("12")).status).toBe(404);
    expect(d1.calls[0].args).toEqual([12]);
  });

  it("serves a base64 image stored in D1", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    setEnv({ DB: withRow({ mime: "image/png", image_data: btoa(String.fromCharCode(...bytes)), r2_key: null }).db });
    const response = await get("1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it("streams the image from R2 when the row has an r2_key", async () => {
    const bucket = { get: vi.fn(async () => ({ body: new Response("r2-bytes").body })) };
    setEnv({ DB: withRow({ mime: "image/webp", image_data: "", r2_key: "rooms/1/abc" }).db, BUCKET: bucket });
    const response = await get("1");
    expect(bucket.get).toHaveBeenCalledWith("rooms/1/abc");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(await response.text()).toBe("r2-bytes");
  });

  it("returns 404 when the R2 object is missing", async () => {
    setEnv({ DB: withRow({ mime: "image/webp", image_data: "", r2_key: "rooms/1/gone" }).db, BUCKET: { get: vi.fn(async () => null) } });
    expect((await get("1")).status).toBe(404);
  });

  it("returns 404 when the row points to R2 but no BUCKET is bound", async () => {
    setEnv({ DB: withRow({ mime: "image/webp", image_data: "", r2_key: "rooms/1/abc" }).db });
    expect((await get("1")).status).toBe(404);
  });
});
