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

const POST_ID = "6f1c2a1e-1111-4222-8333-944455556666";
const AUTHOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0, 0, 2, 8, 6, 0, 0, 0]);

function bucket() {
  return { put: vi.fn(async () => ({})), delete: vi.fn(async () => {}), get: vi.fn(async () => null) };
}

beforeEach(async () => {
  setEnv({ ADMIN_PASSWORD: "pw-for-tests" });
  cookieValue = (await createAdminSession()).value;
});

describe("POST /api/admin/journal-images", () => {
  const call = async (fields: Record<string, string | File | Array<string | File>>) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
    const { POST } = await import("@/app/api/admin/journal-images/route");
    return POST(new NextRequest(`${ORIGIN}/api/admin/journal-images`, { method: "POST", headers: { origin: ORIGIN }, body: form }));
  };
  const setup = (opts: { exists?: boolean; taken?: number } = {}) => {
    const r2 = bucket();
    const d1 = createD1([
      [/SELECT 1 FROM site_content_items WHERE id/, { first: opts.exists === false ? null : { 1: 1 } }],
      [/COUNT\(\*\) AS n FROM catalog_images/, { first: { n: opts.taken ?? 0 } }],
      [/SELECT id, alt, width, height FROM catalog_images/, { all: [{ id: "photo-1", alt: "Quiet lane", width: 3, height: 2 }] }],
      [/SELECT object_key FROM catalog_images/, { first: { object_key: "catalog/content/x/photo-1" } }],
    ]);
    setEnv({ DB: d1.db, BUCKET: r2 });
    return { d1, r2 };
  };

  it("stores an uploaded photo as the post's next photo, with its description and real size", async () => {
    const { d1, r2 } = setup({ taken: 2 });
    const response = await call({ postId: POST_ID, action: "upload", alt: "Quiet lane in An Thuong at dusk with motorbikes", image: new File([PNG], "lane.png", { type: "image/png" }) });
    expect(response.status).toBe(200);
    expect(r2.put).toHaveBeenCalledTimes(1);
    const insert = d1.sqlCalls(/INSERT INTO catalog_images/)[0];
    expect(insert.sql).toContain("'content'");
    expect(insert.args).toEqual(expect.arrayContaining([POST_ID, "image/png", "Quiet lane in An Thuong at dusk with motorbikes", 2, 3, 2]));
    expect(await response.json()).toMatchObject({ photos: [{ id: "photo-1", url: "/media/catalog/photo-1" }] });
  });

  it("refuses a photo without a description", async () => {
    const { r2 } = setup();
    expect((await call({ postId: POST_ID, action: "upload", alt: "  ", image: new File([PNG], "a.png", { type: "image/png" }) })).status).toBe(400);
    expect(r2.put).not.toHaveBeenCalled();
  });

  it("judges the file by its bytes: an SVG or a script renamed to .png is refused", async () => {
    const { r2 } = setup();
    const response = await call({ postId: POST_ID, action: "upload", alt: "A description of this picture that is long enough", image: new File(["<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"], "a.png", { type: "image/png" }) });
    expect(response.status).toBe(400);
    expect((await response.json() as { failed: string[] }).failed[0]).toContain("JPG, PNG");
    expect(r2.put).not.toHaveBeenCalled();
  });

  it("stops at the number of photos allowed per post", async () => {
    const { r2 } = setup({ taken: 30 });
    expect((await call({ postId: POST_ID, action: "upload", alt: "A description of this picture that is long enough", image: new File([PNG], "a.png", { type: "image/png" }) })).status).toBe(400);
    expect(r2.put).not.toHaveBeenCalled();
  });

  it("will not add a photo to a post that has not been saved yet", async () => {
    setup({ exists: false });
    expect((await call({ postId: POST_ID, action: "upload", alt: "x", image: new File([PNG], "a.png") })).status).toBe(404);
  });

  it("rejects an invalid post id and an unknown action", async () => {
    setup();
    expect((await call({ postId: "x'; DROP TABLE", action: "upload" })).status).toBe(400);
    expect((await call({ postId: POST_ID, action: "explode" })).status).toBe(400);
  });

  it("deletes a photo from the database and from storage", async () => {
    const { d1, r2 } = setup();
    expect((await call({ postId: POST_ID, action: "delete", imageId: "photo-1" })).status).toBe(200);
    expect(d1.sqlCalls(/DELETE FROM catalog_images/)).toHaveLength(1);
    expect(r2.delete).toHaveBeenCalledWith("catalog/content/x/photo-1");
  });

  it("copies pictures from other websites only when the address is safe", async () => {
    const { r2 } = setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PNG, { status: 200 })));
    const response = await call({ postId: POST_ID, action: "import", url: ["https://cdn.example.com/a.png", "https://127.0.0.1/admin.png", "http://example.com/b.png"], alt: ["Quiet lane in An Thuong at dusk with motorbikes", "x", "y"] });
    const data = await response.json() as { added: Array<{ id: string; url: string }>; failed: string[] };
    expect(data.added).toHaveLength(1);
    expect(data.added[0].url).toBe("https://cdn.example.com/a.png");
    expect(data.failed).toHaveLength(2);
    expect(r2.put).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/admin/authors", () => {
  const call = async (fields: Record<string, string | File>) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    const { POST } = await import("@/app/api/admin/authors/route");
    return POST(new NextRequest(`${ORIGIN}/api/admin/authors`, { method: "POST", headers: { origin: ORIGIN }, body: form }));
  };
  const setup = () => {
    const r2 = bucket();
    const d1 = createD1([[/SELECT id, object_key FROM catalog_images/, { all: [] }]]);
    setEnv({ DB: d1.db, BUCKET: r2 });
    return { d1, r2 };
  };
  const where = (response: Response) => new URL(response.headers.get("location")!).search;

  it("adds an author", async () => {
    const { d1 } = setup();
    const response = await call({ action: "save", name: "  Nguyen   Van A ", role: "Head of Operations", bio: "Runs the buildings.", url: "https://example.com/a" });
    expect(response.status).toBe(303);
    expect(where(response)).toBe("?saved=author");
    expect(d1.sqlCalls(/INSERT INTO authors/)[0].args.slice(1)).toEqual(["Nguyen Van A", "Head of Operations", "Runs the buildings.", "https://example.com/a"]);
  });

  it("needs a name and an https page address", async () => {
    const { d1 } = setup();
    expect(where(await call({ action: "save", name: "" }))).toBe("?error=name");
    expect(where(await call({ action: "save", name: "A", url: "javascript:alert(1)" }))).toBe("?error=url");
    expect(where(await call({ action: "save", name: "A", url: "http://example.com" }))).toBe("?error=url");
    expect(d1.sqlCalls(/INSERT INTO authors/)).toHaveLength(0);
  });

  it("cuts the bio to its limit", async () => {
    const { d1 } = setup();
    await call({ action: "save", name: "A", bio: "x".repeat(900) });
    expect(String(d1.sqlCalls(/INSERT INTO authors/)[0].args[3])).toHaveLength(300);
  });

  it("stores the photo and refuses a file that is not a picture", async () => {
    const { d1, r2 } = setup();
    expect(where(await call({ action: "save", name: "A", photo: new File([PNG], "me.png", { type: "image/png" }) }))).toBe("?saved=author");
    expect(r2.put).toHaveBeenCalledTimes(1);
    expect(d1.sqlCalls(/UPDATE authors SET photo_id/)).toHaveLength(1);
    expect(where(await call({ action: "save", name: "A", photo: new File(["<script>"], "me.png", { type: "image/png" }) }))).toBe("?error=photo");
  });

  it("removes an author and clears the author from their posts", async () => {
    const { d1 } = setup();
    expect(where(await call({ action: "delete", id: AUTHOR_ID }))).toBe("?saved=deleted");
    expect(d1.sqlCalls(/UPDATE site_content_items SET author_id/)[0].args).toEqual([AUTHOR_ID]);
    expect(d1.sqlCalls(/DELETE FROM authors/)[0].args).toEqual([AUTHOR_ID]);
  });

  it("refuses an unknown action or a bad id", async () => {
    setup();
    expect((await call({ action: "explode" })).status).toBe(400);
    expect((await call({ action: "save", name: "A", id: "x'; --" })).status).toBe(400);
  });
});
