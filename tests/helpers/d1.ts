import { vi } from "vitest";

export type Call = { sql: string; args: unknown[]; method: "first" | "all" | "run" };
type Result = { first?: unknown; all?: unknown[]; run?: Record<string, unknown> };
type Handler = (args: unknown[], sql: string) => Result;

/**
 * Minimal D1 fake. Register handlers with a SQL regex; the first match answers.
 * Unmatched statements return empty results. Every executed statement is recorded in `calls`.
 */
export function createD1(handlers: [RegExp, Handler | Result][] = []) {
  const calls: Call[] = [];
  const resolve = (sql: string, args: unknown[]): Result => {
    const hit = handlers.find(([pattern]) => pattern.test(sql));
    if (!hit) return {};
    return typeof hit[1] === "function" ? hit[1](args, sql) : hit[1];
  };
  const statement = (sql: string, args: unknown[] = []) => ({
    bind: (...bound: unknown[]) => statement(sql, bound),
    first: async () => { calls.push({ sql, args, method: "first" }); return resolve(sql, args).first ?? null; },
    all: async () => { calls.push({ sql, args, method: "all" }); return { results: resolve(sql, args).all ?? [] }; },
    run: async () => { calls.push({ sql, args, method: "run" }); return { success: true, meta: { last_row_id: 1, changes: 1 }, ...resolve(sql, args).run }; },
  });
  const db = {
    prepare: vi.fn((sql: string) => statement(sql)),
    batch: vi.fn(async (statements: ReturnType<typeof statement>[]) => Promise.all(statements.map(item => item.run()))),
  };
  return { db, calls, sqlCalls: (pattern: RegExp) => calls.filter(call => pattern.test(call.sql)) };
}
