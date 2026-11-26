import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createAdminSession } from "@/lib/admin";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN } from "./helpers/fixtures";

let cookieValue = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name.endsWith("doraemon_admin") && cookieValue ? { value: cookieValue } : undefined) }),
}));

resetEnvBeforeEach();

function bucket(objects: Record<string, Uint8Array<ArrayBuffer>> = {}) {
  return {
    put: vi.fn(async () => ({})),
    delete: vi.fn(async () => {}),
    get: vi.fn(async (key: string) => (objects[key] ? { body: new Blob([objects[key]]).stream() } : null)),
  };
}

const PNG_1x1 = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0, 0, 2, 8, 6, 0, 0, 0]);

async function upload(file: File) {
  const form = new FormData();
  form.set("kind", "home");
  form.set("sourceId", "home-hero");
  form.append("image", file);
  const { POST } = await import("@/app/api/admin/catalog-images/route");
  return POST(new NextRequest(`${ORIGIN}/api/admin/catalog-images`, { method: "POST", headers: { origin: ORIGIN }, body: form }));
}

describe("single-photo home areas", () => {
  let d1: ReturnType<typeof createD1>, r2: ReturnType<typeof bucket>;
  beforeEach(async () => {
    d1 = createD1([
      [/SELECT id, object_key FROM catalog_images WHERE owner_type = 'home'/, { all: [{ id: "old-photo", object_key: "catalog/home/home-hero/old" }] }],
      [/SELECT COUNT\(\*\) AS total FROM catalog_images/, { first: { total: 1 } }],
    ]);
    r2 = bucket();
    setEnv({ DB: d1.db, BUCKET: r2, ADMIN_PASSWORD: "pw-for-tests" });
    cookieValue = (await createAdminSession()).value;
  });

  it("keeps the current photo when the new file is rejected", async () => {
    const response = await upload(new File(["not an image"], "photo.heic", { type: "image/heic" }));
    expect(response.status).toBe(400);
    expect(d1.sqlCalls(/DELETE FROM catalog_images/)).toHaveLength(0);
    expect(r2.delete).not.toHaveBeenCalled();
  });

  it("replaces the current photo once the new one is saved", async () => {
    const response = await upload(new File([PNG_1x1], "cover.png", { type: "image/png" }));
    expect(response.status).toBe(303);
    expect(d1.sqlCalls(/INSERT INTO catalog_images/)).toHaveLength(1);
    expect(d1.sqlCalls(/DELETE FROM catalog_images/).map(call => call.args)).toEqual([["old-photo"]]);
    expect(r2.delete).toHaveBeenCalledWith("catalog/home/home-hero/old");
  });
});

describe("photo size backfill", () => {
  it("marks unreadable photos as checked so later batches move on", async () => {
    const d1 = createD1([[/WHERE width IS NULL OR height IS NULL/, { all: [{ id: "a", object_key: "ka" }, { id: "b", object_key: "kb" }] }]]);
    setEnv({ DB: d1.db, BUCKET: bucket({ kb: PNG_1x1 }), ADMIN_PASSWORD: "pw-for-tests" });
    cookieValue = (await createAdminSession()).value;
    const { POST } = await import("@/app/api/admin/catalog-images/backfill/route");
    const response = await POST(new NextRequest(`${ORIGIN}/api/admin/catalog-images/backfill`, { method: "POST", headers: { origin: ORIGIN } }));
    expect(new URL(response.headers.get("location")!).searchParams.get("sizes")).toBe("1");
    expect(d1.sqlCalls(/UPDATE catalog_images SET width/).map(call => call.args)).toEqual([[0, 0, "a"], [3, 2, "b"]]);
  });
});
