/**
 * Tiny structured logger. Single-line JSON per event so it's greppable in
 * `next dev` output, `wrangler tail`, and any log-aggregator you pipe
 * Cloudflare's worker logs to.
 *
 * Levels:
 *   debug — verbose; enable when actively debugging.
 *   info  — normal request lifecycle, config presence, successful operations.
 *   warn  — recoverable issues (fallback path taken, retry needed).
 *   error — operation failed, request returned 5xx.
 *
 * Output goes to console.log for debug/info and console.error for
 * warn/error. The split matters in Cloudflare Workers: error-level
 * shows up in the dashboard's error log stream (with alerting
 * hooks), while info-level is only in the live tail.
 *
 * Edge-runtime safe — uses Date + JSON, no Node-only APIs.
 */

type Level = "debug" | "info" | "warn" | "error";

/** Numeric ordering for threshold comparison. */
const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SERVICE = "widgetly";

/**
 * Effective log threshold. Read once at module load. Set via
 * `LOG_LEVEL` env var (one of `debug`, `info`, `warn`, `error`,
 * or `silent` to suppress everything). Default is `info`.
 *
 * In Cloudflare, set this with `wrangler secret put LOG_LEVEL`
 * (don't put it in wrangler.toml — it's environment-specific).
 *
 * In dev, set it in `.env.local`:
 *     LOG_LEVEL=debug
 *
 * The `debug` level is verbose; keep it off in production unless
 * you're actively diagnosing something. `info` is the right
 * baseline for a healthy production deployment.
 */
function resolveThreshold(): number {
  // In the Workers runtime, `process.env` is only available when
  // the `nodejs_compat` flag is enabled (which it is in
  // wrangler.toml). In the dev server it just works.
  const raw = (typeof process !== "undefined" ? process.env?.LOG_LEVEL : undefined)?.toLowerCase();
  if (raw === "silent") return Infinity;
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return LEVEL_RANK[raw];
  }
  return LEVEL_RANK.info;
}

const THRESHOLD = resolveThreshold();

function emit(level: Level, tag: string, msg: string, data?: Record<string, unknown>) {
  if (LEVEL_RANK[level] < THRESHOLD) return;
  const entry: Record<string, unknown> = {
    t: new Date().toISOString(),
    level,
    svc: SERVICE,
    tag,
    msg,
    ...(data ?? {}),
  };
  // One JSON object per line so it doesn't wrap in terminals.
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (tag: string, msg: string, data?: Record<string, unknown>) =>
    emit("debug", tag, msg, data),
  info: (tag: string, msg: string, data?: Record<string, unknown>) => emit("info", tag, msg, data),
  warn: (tag: string, msg: string, data?: Record<string, unknown>) => emit("warn", tag, msg, data),
  error: (tag: string, msg: string, data?: Record<string, unknown>) =>
    emit("error", tag, msg, data),
};

/**
 * Mask an email so log lines don't leak PII. Keeps the domain so you can
 * still spot which org is signing up.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal =
    local.length <= 2 ? "*".repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a key/token: first 4 chars + "..." + last 4 chars + total length.
 * Enough to identify "is this the same key" or "is the key shape right"
 * without leaking the secret.
 */
export function maskSecret(value: string | undefined | null): {
  present: boolean;
  prefix?: string;
  suffix?: string;
  length?: number;
} {
  if (!value) return { present: false };
  return {
    present: true,
    prefix: value.slice(0, 4),
    suffix: value.slice(-4),
    length: value.length,
  };
}
