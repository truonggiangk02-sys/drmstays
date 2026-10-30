import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createAdminSession } from "@/lib/admin";
import { createD1 } from "./helpers/d1";
import { resetEnvBeforeEach, setEnv } from "./helpers/env";
import { ORIGIN } from "./helpers/fixtures";

// The admin cookie the request "carries". The real isAdmin() / signature check runs against it.
let cookieValue = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name.endsWith("doraemon_admin") && cookieValue ? { value: cookieValue } : undefined) }),
}));

resetEnvBeforeEach();
beforeEach(() => {
  cookieValue = "";
  setEnv({ DB: createD1().db, ADMIN_PASSWORD: "correct horse battery staple" });
});

// Every admin API route is picked up automatically, so a route added later cannot skip the check.
const modules = import.meta.glob("../app/api/admin/*/route.ts");
const open = new Set(["login", "logout"]); // login must work without a session; logout only clears it
const routes = Object.keys(modules).map((path) => ({ name: path.split("/").at(-2)!, load: modules[path] })).filter((route) => !open.has(route.name));

const post = (name: string, headers: Record<string, string> = { origin: ORIGIN }) =>
  new NextRequest(`${ORIGIN}/api/admin/${name}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...headers }, body: "id=1&status=closed" });

async function call(name: string, load: () => Promise<unknown>, headers?: Record<string, string>) {
  const mod = (await load()) as { POST: (request: NextRequest) => Promise<Response> };
  return mod.POST(post(name, headers));
}

describe("admin API routes", () => {
  it("found the admin routes to test", () => expect(routes.length).toBeGreaterThanOrEqual(5));

  describe.each(routes)("POST /api/admin/$name", ({ name, load }) => {
    it("rejects a visitor with no session (403)", async () => {
      expect((await call(name, load)).status).toBe(403);
    });

    it("rejects a forged or tampered cookie (403)", async () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      cookieValue = `${future}.11111111-2222-4333-8444-555555555555.${"a".repeat(64)}`;
      expect((await call(name, load)).status).toBe(403);
    });

    it("rejects a genuine session sent from another origin (403)", async () => {
      cookieValue = (await createAdminSession()).value;
      expect((await call(name, load, { origin: "https://evil.test" })).status).toBe(403);
    });

    it("rejects an expired session (403)", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        cookieValue = (await createAdminSession()).value;
        vi.setSystemTime(Date.now() + 8 * 24 * 3600 * 1000); // sessions last 7 days
        expect((await call(name, load)).status).toBe(403);
      } finally { vi.useRealTimers(); }
    });

    it("lets a genuine session from the same origin past the auth check", async () => {
      cookieValue = (await createAdminSession()).value;
      expect((await call(name, load)).status).not.toBe(403);
    });
  });

  it("a session signed with a different password is rejected", async () => {
    cookieValue = (await createAdminSession()).value;
    setEnv({ DB: createD1().db, ADMIN_PASSWORD: "a different password" });
    for (const { name, load } of routes) expect((await call(name, load)).status).toBe(403);
  });
});
