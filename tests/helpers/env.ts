import { env } from "cloudflare:workers";
import { beforeEach } from "vitest";

const testEnv = env as Record<string, unknown>;

/** Clears every binding/variable before each test so cases can't leak into each other. */
export function resetEnvBeforeEach() {
  beforeEach(() => {
    for (const key of Object.keys(testEnv)) delete testEnv[key];
  });
}

export function setEnv(values: Record<string, unknown>) {
  Object.assign(testEnv, values);
}
