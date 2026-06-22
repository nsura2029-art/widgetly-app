/**
 * Server-side D1 client for the admin dashboard.
 *
 * Same lazy-init pattern as the public D1 helpers (`getD1()` reads the
 * binding on first call). The admin auth layer needs to operate in the
 * edge runtime (Cloudflare Workers via OpenNext), so we avoid any
 * Node-only modules here.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { log } from "@/lib/log";

// Mirror the D1 type surface from server.ts. Kept inline to avoid an
// import cycle (server.ts re-imports helpers from here in some flows).
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success: boolean; meta?: unknown }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

let cached: D1Database | null = null;

function getDb(): D1Database {
  if (cached) return cached;
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database })?.DB;
    if (!db) throw new Error("D1 binding 'DB' is not configured");
    cached = db;
    return db;
  } catch (err) {
    log.error("admin.d1.getDb.failed", "d1-missing", { error: (err as Error).message });
    throw err;
  }
}

/** Wraps a D1 call so missing-table errors are caught and logged. */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    if (
      msg.includes("no such table") ||
      msg.includes("D1 binding missing") ||
      msg.includes("D1 binding 'DB' is not configured")
    ) {
      log.warn("admin.d1.safeQuery.fallback", "d1-missing-table", { error: msg });
      return fallback;
    }
    throw err;
  }
}

export { getDb };
