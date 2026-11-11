import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/social-links/route";
import { emptyContactChannels } from "@/lib/contact-channels";
import { CONTACT } from "@/lib/site";
import { emptySocialLinks, getSocialLinks, normalizeSocialUrl, publicSocialLinks } from "@/lib/social-links";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

const admin = vi.hoisted(() => ({ ok: true }));
vi.mock("@/lib/admin", () => ({ isAdmin: async () => admin.ok, validOrigin: () => true }));
resetEnvBeforeEach();

describe("normalizeSocialUrl", () => {
  it("accepts a profile on the right network", () => {
    expect(normalizeSocialUrl("instagram", "https://www.instagram.com/drmstays")).toBe("https://www.instagram.com/drmstays");
    expect(normalizeSocialUrl("tiktok", " https://www.tiktok.com/@drmstays ")).toBe("https://www.tiktok.com/@drmstays");
    expect(normalizeSocialUrl("youtube", "https://youtu.be/abc")).toBe("https://youtu.be/abc");
  });
  it("treats empty input as 'not set'", () => expect(normalizeSocialUrl("instagram", "  ")).toBe(""));
  it("rejects other hosts, http, bare domains and credentials", () => {
    for (const bad of ["https://facebook.com/x", "http://www.instagram.com/x", "https://www.instagram.com/", "https://user:pw@www.instagram.com/x", "javascript:alert(1)", "instagram.com/x"])
      expect(normalizeSocialUrl("instagram", bad), bad).toBeNull();
  });
});

describe("publicSocialLinks", () => {
  it("shows the default Facebook page until the owner enters one", () => {
    expect(publicSocialLinks(emptyContactChannels(), emptySocialLinks())).toEqual([{ name: "Facebook", url: CONTACT.facebook }]);
  });
  it("uses the owner's Facebook, and hides it when unpublished", () => {
    const channels = emptyContactChannels();
    channels.facebook = { url: "https://www.facebook.com/drm", published: true };
    expect(publicSocialLinks(channels, emptySocialLinks())).toEqual([{ name: "Facebook", url: "https://www.facebook.com/drm" }]);
    channels.facebook.published = false;
    expect(publicSocialLinks(channels, emptySocialLinks())).toEqual([]);
  });
  it("lists only published networks, in a fixed order", () => {
    const social = emptySocialLinks();
    social.youtube = { url: "https://www.youtube.com/@drm", published: true };
    social.instagram = { url: "https://www.instagram.com/drm", published: true };
    social.tiktok = { url: "https://www.tiktok.com/@drm", published: false };
    expect(publicSocialLinks(emptyContactChannels(), social).map(link => link.name)).toEqual(["Facebook", "Instagram", "YouTube"]);
  });
});

describe("getSocialLinks", () => {
  it("reads saved rows and ignores bad or unknown ones", async () => {
    const d1 = createD1([[/FROM social_links/, { all: [
      { network: "instagram", url: "https://www.instagram.com/drm", published: 1 },
      { network: "tiktok", url: "https://evil.example/x", published: 1 },
      { network: "myspace", url: "https://myspace.com/x", published: 1 },
    ] }]]);
    setEnv({ DB: d1.db });
    const links = await getSocialLinks();
    expect(links.instagram).toEqual({ url: "https://www.instagram.com/drm", published: true });
    expect(links.tiktok).toEqual({ url: "", published: false });
  });
  it("shows no profiles (and does not throw) when the table is missing", async () => {
    setEnv({ DB: { prepare: () => ({ all: async () => { throw new Error("no such table: social_links"); } }) } });
    expect(await getSocialLinks()).toEqual(emptySocialLinks());
  });
});

function post(fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return POST(new NextRequest("https://drmstays.vn/api/admin/social-links", { method: "POST", body, headers: { origin: "https://drmstays.vn" } }));
}

describe("POST /api/admin/social-links", () => {
  it("saves every network and goes back to the admin page", async () => {
    const d1 = createD1();
    setEnv({ DB: d1.db });
    const response = await post({ instagramUrl: "https://www.instagram.com/drm", instagramPublished: "on" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("socialSaved=1");
    expect(d1.db.batch).toHaveBeenCalledTimes(1);
    const saved = d1.calls.filter(call => /INSERT INTO social_links/.test(call.sql)).map(call => call.args);
    expect(saved).toEqual([["instagram", "https://www.instagram.com/drm", 1], ["tiktok", "", 0], ["youtube", "", 0], ["linkedin", "", 0]]);
  });
  it("refuses a wrong link or a shown network without a link, and saves nothing", async () => {
    const d1 = createD1();
    setEnv({ DB: d1.db });
    expect((await post({ instagramUrl: "https://facebook.com/x" })).headers.get("location")).toContain("socialError=invalid");
    expect((await post({ tiktokPublished: "on" })).headers.get("location")).toContain("socialError=invalid");
    expect(d1.db.batch).not.toHaveBeenCalled();
  });
  it("is for the admin only", async () => {
    admin.ok = false;
    setEnv({ DB: createD1().db });
    expect((await post({})).status).toBe(403);
    admin.ok = true;
  });
});
