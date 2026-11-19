import { describe, expect, it } from "vitest";
import { listInquiries, saveInquiry } from "@/lib/inquiries";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

resetEnvBeforeEach();
const cols = "id, name, phone, status, created_at";

describe("listInquiries", () => {
  it("filters by status and text, and escapes LIKE wildcards", async () => {
    const d1 = createD1();
    setEnv({ DB: d1.db });
    await listInquiries("catalog_inquiries", cols, ["name", "phone"], { status: "new", q: "50%_x" });
    const call = d1.sqlCalls(/FROM catalog_inquiries WHERE/)[0];
    expect(call.sql).toContain("status = ?");
    expect(call.sql).toContain("name LIKE ? ESCAPE");
    expect(call.args).toEqual(["new", "%50\\%\\_x%", "%50\\%\\_x%", 0]);
  });

  it("ignores an unknown status and pages 50 at a time", async () => {
    const d1 = createD1();
    setEnv({ DB: d1.db });
    await listInquiries("catalog_inquiries", cols, ["name"], { status: "bogus", page: 3 });
    const call = d1.sqlCalls(/FROM catalog_inquiries/)[0];
    expect(call.sql).not.toContain("WHERE");
    expect(call.args).toEqual([100]);
  });

  it("counts requests per status", async () => {
    const d1 = createD1([[/GROUP BY status/, { all: [{ status: "new", n: 3 }, { status: "closed", n: 2 }] }]]);
    setEnv({ DB: d1.db });
    const list = await listInquiries("partner_inquiries", cols, ["name"], {});
    expect(list.counts).toEqual({ all: 5, new: 3, contacted: 0, closed: 2 });
  });

  it("still lists before the note column exists", async () => {
    const d1 = createD1([[/, note FROM/, () => { throw new Error("no such column: note"); }]]);
    setEnv({ DB: d1.db });
    const list = await listInquiries("catalog_inquiries", cols, ["name"], {});
    expect(list.hasNote).toBe(false);
  });
});

describe("saveInquiry", () => {
  it("saves a trimmed note with the status, or only the status when no note is sent", async () => {
    const d1 = createD1();
    setEnv({ DB: d1.db });
    await saveInquiry("catalog_inquiries", "id1", "contacted", "  Đã gọi, hẹn xem phòng  ");
    expect(d1.sqlCalls(/SET status = \?, note = \?/)[0].args).toEqual(["contacted", "Đã gọi, hẹn xem phòng", "id1"]);
    await saveInquiry("partner_inquiries", "id2", "closed", null);
    expect(d1.sqlCalls(/UPDATE partner_inquiries SET status = \? WHERE/)[0].args).toEqual(["closed", "id2"]);
  });

  it("falls back to saving the status when the note column is missing", async () => {
    const d1 = createD1([[/note = \?/, () => { throw new Error("no such column: note"); }]]);
    setEnv({ DB: d1.db });
    await saveInquiry("catalog_inquiries", "id1", "closed", "x");
    expect(d1.sqlCalls(/SET status = \? WHERE/)).toHaveLength(1);
  });
});
