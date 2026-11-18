import { describe, expect, it } from "vitest";
import { kindOf } from "@/lib/room-kind";

describe("kindOf", () => {
  it("recognises studios, one-bedroom and two-bedroom homes from the name", () => {
    expect(kindOf("Studio with desk")).toBe("studio");
    expect(kindOf("Căn hộ 1 PN Oceanfront")).toBe("oneBed");
    expect(kindOf("Căn hộ 2 phòng ngủ")).toBe("twoBed");
    expect(kindOf("2-Bedroom Suite")).toBe("twoBed");
  });
  it("falls back to other", () => {
    expect(kindOf("Penthouse")).toBe("other");
    expect(kindOf("Căn hộ 3 PN")).toBe("other");
  });
});
