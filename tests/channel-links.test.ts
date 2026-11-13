import { describe, expect, it } from "vitest";
import { instagramMessageUrl, messengerUrl } from "@/lib/contact-channels";

describe("messengerUrl", () => {
  it("opens Messenger for a numeric profile address", () => {
    expect(messengerUrl("https://www.facebook.com/profile.php?id=61589018612745")).toBe("https://m.me/61589018612745");
  });
  it("opens Messenger for a named page", () => {
    expect(messengerUrl("https://www.facebook.com/drmstays")).toBe("https://m.me/drmstays");
    expect(messengerUrl("https://m.facebook.com/drmstays/")).toBe("https://m.me/drmstays");
  });
  it("keeps m.me links and leaves other addresses alone", () => {
    expect(messengerUrl("https://m.me/drmstays")).toBe("https://m.me/drmstays");
    expect(messengerUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(messengerUrl("https://www.facebook.com/groups/123")).toBe("https://www.facebook.com/groups/123");
  });
});

describe("instagramMessageUrl", () => {
  it("opens the message box of a profile", () => {
    expect(instagramMessageUrl("https://www.instagram.com/drm.stays/")).toBe("https://ig.me/m/drm.stays");
  });
  it("keeps ig.me links and does not treat posts as profiles", () => {
    expect(instagramMessageUrl("https://ig.me/m/drm.stays")).toBe("https://ig.me/m/drm.stays");
    expect(instagramMessageUrl("https://www.instagram.com/p/ABC/")).toBe("https://www.instagram.com/p/ABC/");
  });
});
