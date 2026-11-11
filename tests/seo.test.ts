import { describe, expect, it } from "vitest";
import { policies, policySections } from "@/lib/policies";
import { breadcrumbData, structuredData } from "@/lib/structured-data";
import { jsonLd } from "@/lib/site";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
resetEnvBeforeEach();

const building = { id: "b1", name: "AnLiu", description: "Near the sea", address: "12 Mai Thuc Lan", latitude: 16.05, longitude: 108.24, images: [{ url: "/img/1.jpg" }] };
const room = { id: "r1", name: "301", description: "Bright", monthlyPrice: 9_000_000, areaSqm: 30, maxGuests: 2, beds: 1, images: [] };

describe("policies", () => {
  it("has a title and body for every policy in both languages", () => {
    for (const lang of ["vi", "en"] as const) for (const key of policySections) {
      const policy = policies[lang][key];
      expect(policy.title).not.toBe("");
      expect(policy.blocks.length).toBeGreaterThan(0);
      for (const block of policy.blocks) { expect(block.heading).not.toBe(""); expect(block.paragraphs.length).toBeGreaterThan(0); }
    }
  });
});

describe("structuredData", () => {
  it("is skipped until SITE_URL is configured (it needs absolute URLs)", () => {
    expect(structuredData("home", "vi")).toBeNull();
    expect(structuredData("building", "vi", building)).toBeNull();
  });

  it("describes the organisation and site on the home page", () => {
    setEnv({ SITE_URL: "https://drmstays.test/" });
    const data = structuredData("home", "en") as { "@graph": Array<{ "@type": string; url: string }> };
    expect(data["@graph"].map(item => item["@type"])).toEqual(["LodgingBusiness", "WebSite"]);
    expect(data["@graph"][1].url).toBe("https://drmstays.test/en");
  });

  it("lists the business phone, email and address on the home page", () => {
    setEnv({ SITE_URL: "https://drmstays.test" });
    const org = (structuredData("home", "vi", undefined, undefined, { sameAs: ["https://www.facebook.com/profile.php?id=61589018612745"] }) as { "@graph": Json[] })["@graph"][0];
    expect(org.telephone).toBe("+84869900000");
    expect(org.email).toBe("drmstayshome@gmail.com");
    expect(org.sameAs).toEqual(["https://www.facebook.com/profile.php?id=61589018612745"]);
    expect(org.knowsLanguage).toEqual(["vi", "en", "ja", "ko", "zh", "ru"]);
    expect(org.address).toMatchObject({ "@type": "PostalAddress", streetAddress: "K234/29-31 Đỗ Bá", addressLocality: "Đà Nẵng", addressCountry: "VN" });
  });

  it("leaves sameAs out when there are no social profiles", () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    const org = (structuredData("home", "vi") as { "@graph": Json[] })["@graph"][0];
    expect(org).not.toHaveProperty("sameAs");
  });

  it("describes a building with an address, coordinates and absolute image URLs", () => {
    setEnv({ SITE_URL: "https://drmstays.test" });
    const data = structuredData("building", "vi", building) as Json;
    expect(data["@type"]).toBe("ApartmentComplex");
    expect(data.url).toBe("https://drmstays.test/vi/buildings/b1");
    expect(data.image).toEqual(["https://drmstays.test/img/1.jpg"]);
    expect(data.geo).toEqual({ "@type": "GeoCoordinates", latitude: 16.05, longitude: 108.24 });
  });

  it("describes a room with a monthly offer and drops empty fields", () => {
    setEnv({ SITE_URL: "https://drmstays.test" });
    const data = structuredData("room", "vi", room, building) as Json;
    expect(data.offers).toMatchObject({ price: 9_000_000, priceCurrency: "VND" });
    expect(data.containedInPlace.name).toBe("AnLiu");
    const free = structuredData("room", "vi", { ...room, monthlyPrice: 0, areaSqm: 0 }) as Record<string, unknown>;
    expect("offers" in free).toBe(false);
    expect("floorSize" in free).toBe(false);
  });

  it("can never close the script tag it is embedded in", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("breadcrumbData", () => {
  const trail = [{ name: "Home", path: "/vi" }, { name: "Stays", path: "/vi/stays" }, { name: "AnLiu", path: "/vi/buildings/b1" }];
  it("needs SITE_URL because every item must be an absolute address", () => {
    setEnv({});
    expect(breadcrumbData(trail)).toBeNull();
  });
  it("numbers the trail from the home page and uses absolute addresses", () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    const ld = breadcrumbData(trail) as Json;
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.map((item: Json) => [item.position, item.name, item.item])).toEqual([
      [1, "Home", "https://drmstays.vn/vi"], [2, "Stays", "https://drmstays.vn/vi/stays"], [3, "AnLiu", "https://drmstays.vn/vi/buildings/b1"],
    ]);
  });
  it("is null for an empty trail", () => {
    setEnv({ SITE_URL: "https://drmstays.vn" });
    expect(breadcrumbData([])).toBeNull();
  });
});
