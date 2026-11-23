import { describe, expect, it } from "vitest";
import { eventForLink, leadFormFor, locationOf } from "@/lib/analytics-events";

describe("eventForLink", () => {
  it("names the contact channels", () => {
    expect(eventForLink("https://wa.me/84869900000")).toEqual({ name: "click_whatsapp", channel: "whatsapp" });
    expect(eventForLink("https://m.me/61589018612745")).toEqual({ name: "click_messenger", channel: "messenger" });
    expect(eventForLink("https://ig.me/m/drmstayshomedn")).toEqual({ name: "click_instagram_dm", channel: "instagram" });
    expect(eventForLink("https://zalo.me/0869900000")?.name).toBe("click_zalo");
    expect(eventForLink("https://t.me/drmstays")?.name).toBe("click_telegram");
    expect(eventForLink("mailto:drmstayshome@gmail.com")).toEqual({ name: "click_email", channel: "email" });
    expect(eventForLink("tel:+84869900000")).toEqual({ name: "click_phone", channel: "phone" });
    expect(eventForLink("https://www.google.com/maps/dir/?api=1&destination=x")?.name).toBe("click_directions");
  });

  it("ignores other links", () => {
    expect(eventForLink("/en/stays")).toBeNull();
    expect(eventForLink("https://www.facebook.com/profile.php?id=1")).toBeNull();
    expect(eventForLink("https://www.google.com/maps/search/?api=1&query=x")).toBeNull();
    expect(eventForLink("")).toBeNull();
  });
});

describe("leadFormFor", () => {
  it("knows which form came back sent", () => {
    expect(leadFormFor("/en/partners", "?sent=1")).toBe("partner_inquiry");
    expect(leadFormFor("/en/stays", "?sent=1")).toBe("guest_inquiry");
    expect(leadFormFor("/en/types/abc", "?checkIn=2027-01-01&sent=1")).toBe("guest_inquiry");
    expect(leadFormFor("/en/stays", "")).toBeNull();
    expect(leadFormFor("/en/stays", "?sent=0")).toBeNull();
  });
});

describe("locationOf", () => {
  it("tells where the link sits", () => {
    expect(locationOf(["qc-round is-facebook", "qc-stack", "qc-dock"])).toBe("floating_buttons");
    expect(locationOf(["", "structure-footer-intro"])).toBe("footer");
    expect(locationOf(["structure-address"])).toBe("contact_details");
    expect(locationOf(["abc"])).toBe("content");
  });
});
