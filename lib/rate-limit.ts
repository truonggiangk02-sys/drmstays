import { env } from "cloudflare:workers";

// Keys start with the UTC hour ("2026-10-28T10:...") so old rows can be pruned with a plain string comparison.
const KEEP_HOURS = 2;
const PRUNE_CHANCE = 0.02;

export async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Counts one hit for `scope:identity` in the current hour. Returns false once the hourly limit is exceeded. */
export async function consumeRateLimit(scope: string, identity: string, limit: number): Promise<boolean> {
  if (!env.DB) return true;
  const key = `${new Date().toISOString().slice(0, 13)}:${scope}:${await hashKey(identity)}`;
  const row = await env.DB.prepare("INSERT INTO inquiry_rate_limits (key, count) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count").bind(key).first<{ count: number }>();
  return !!row && row.count <= limit;
}

/** Deletes rows from hours before the cutoff. Run occasionally from request paths; the table is otherwise never cleaned. */
export async function pruneRateLimits(now = new Date()): Promise<void> {
  if (!env.DB) return;
  const cutoff = new Date(now.getTime() - KEEP_HOURS * 3600_000).toISOString().slice(0, 13);
  await env.DB.prepare("DELETE FROM inquiry_rate_limits WHERE key < ?").bind(cutoff).run();
}

export async function maybePruneRateLimits(): Promise<void> {
  if (Math.random() >= PRUNE_CHANCE) return;
  try { await pruneRateLimits(); } catch (error) { console.error("Rate limit cleanup failed", error instanceof Error ? error.name : "unknown error"); }
}
