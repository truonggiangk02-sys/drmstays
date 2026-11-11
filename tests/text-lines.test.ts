import { describe, expect, it } from "vitest";
import { splitLines } from "@/lib/text-lines";

describe("splitLines", () => {
  it("keeps one row per typed line and drops bullets", () => {
    expect(splitLines("- Không hút thuốc\n• Giờ yên tĩnh 22:00\n\nKhông thú cưng")).toEqual(["Không hút thuốc", "Giờ yên tĩnh 22:00", "Không thú cưng"]);
  });
  it("cuts one long paragraph into sentences", () => {
    const text = "Nhận phòng từ 15:00, trả phòng trước 12:00. Tối đa 2 khách mỗi căn. Không nhận thú cưng, không tổ chức tiệc. Giờ yên tĩnh từ 22:00 đến 06:00.";
    expect(splitLines(text)).toEqual(["Nhận phòng từ 15:00, trả phòng trước 12:00.", "Tối đa 2 khách mỗi căn.", "Không nhận thú cưng, không tổ chức tiệc.", "Giờ yên tĩnh từ 22:00 đến 06:00."]);
  });
  it("does not split a short sentence or a decimal number", () => {
    expect(splitLines("Chỉ nhận 2 khách.")).toEqual(["Chỉ nhận 2 khách."]);
    expect(splitLines("Phí điện 3.500 đồng mỗi số, tính theo công tơ riêng của từng căn hộ và thanh toán hằng tháng.")).toHaveLength(1);
  });
  it("returns nothing for empty text", () => { expect(splitLines("  \n ")).toEqual([]); });
});
