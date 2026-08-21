import { getStateStore, isDistributed } from "./state-store";

interface BreakerState {
  failures: number;
  lastAttempt: number;
  openUntil: number;
}

const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

// ── In-memory path (fallback when Redis is not configured) ─────────────

const breakers = new Map<string, BreakerState>();

function getMemory(source: string): BreakerState | undefined {
  return breakers.get(source);
}

function setMemory(source: string, state: BreakerState) {
  breakers.set(source, state);
}

function deleteMemory(source: string) {
  breakers.delete(source);
}

function listOpenMemory(): string[] {
  const now = Date.now();
  const open: string[] = [];
  for (const [source, state] of breakers) {
    if (state.failures >= DEFAULT_THRESHOLD && now <= state.openUntil) {
      open.push(source);
    }
  }
  return open;
}

// ── Redis path (distributed, when REDIS_URL is set) ───────────────────

const CB_PREFIX = "cb:";

async function getRedis(source: string): Promise<BreakerState | undefined> {
  const store = getStateStore();
  return store.get(`${CB_PREFIX}${source}`) as Promise<BreakerState | undefined>;
}

async function setRedis(source: string, state: BreakerState) {
  const store = getStateStore();
  const ttlMs = Math.max(1000, state.openUntil - Date.now() + DEFAULT_COOLDOWN_MS);
  await store.set(`${CB_PREFIX}${source}`, state, ttlMs);
}

async function deleteRedis(source: string) {
  const store = getStateStore();
  await store.delete(`${CB_PREFIX}${source}`);
}

async function listOpenRedis(): Promise<string[]> {
  // Keyv doesn't support key iteration, so we maintain a separate index set
  // For now, return empty — the consumer can rely on individual circuit checks.
  // This is a known limitation of the Keyv-based approach.
  return [];
}

// ── Unified API ───────────────────────────────────────────────────────

/**
 * Decide whether an upstream error indicates the source itself is down.
 * 4xx client errors (404 nonexistent book, 400 bad params, 403 block, 429 rate limit)
 * prove the source is up and must NOT trip the breaker — otherwise 3 bogus requests
 * could take a healthy source offline for everyone. Transport errors (no HTTP response)
 * and 5xx count as outages.
 */
export function isSourceOutage(err: unknown): boolean {
  const status = (err as { response?: { statusCode?: number } } | null)?.response?.statusCode;
  if (typeof status !== "number") return true;
  return status >= 500;
}

export async function isCircuitOpen(source: string): Promise<boolean> {
  if (isDistributed()) {
    const state = await getRedis(source);
    if (!state) return false;
    if (state.failures < DEFAULT_THRESHOLD) return false;
    if (Date.now() > state.openUntil) {
      state.failures = 0;
      await setRedis(source, state);
      return false;
    }
    return true;
  }

  const state = getMemory(source);
  if (!state) return false;
  if (state.failures < DEFAULT_THRESHOLD) return false;
  if (Date.now() > state.openUntil) {
    state.failures = 0;
    return false;
  }
  return true;
}

export async function recordSuccess(source: string) {
  if (isDistributed()) {
    await deleteRedis(source);
    return;
  }
  deleteMemory(source);
}

export async function recordFailure(source: string, err?: unknown) {
  if (err && !isSourceOutage(err)) return;

  if (isDistributed()) {
    const state = (await getRedis(source)) || { failures: 0, lastAttempt: 0, openUntil: 0 };
    state.failures += 1;
    state.lastAttempt = Date.now();
    if (state.failures >= DEFAULT_THRESHOLD) {
      state.openUntil = Date.now() + DEFAULT_COOLDOWN_MS;
      console.warn(`[circuit-breaker] ${source} opened (${state.failures} failures) — skipping for ${DEFAULT_COOLDOWN_MS / 1000}s`);
    }
    await setRedis(source, state);
    return;
  }

  let state = getMemory(source);
  if (!state) {
    state = { failures: 0, lastAttempt: 0, openUntil: 0 };
    setMemory(source, state);
  }
  state.failures += 1;
  state.lastAttempt = Date.now();
  if (state.failures >= DEFAULT_THRESHOLD) {
    state.openUntil = Date.now() + DEFAULT_COOLDOWN_MS;
    console.warn(`[circuit-breaker] ${source} opened (${state.failures} failures) — skipping for ${DEFAULT_COOLDOWN_MS / 1000}s`);
  }
}

/**
 * Human-readable list of currently open circuits, e.g. ["nhentai.net"].
 * Note: when using Redis-backed distributed state, this returns an empty array
 * because Keyv does not support key iteration. Individual isCircuitOpen() checks
 * still work correctly.
 */
export async function getOpenCircuits(): Promise<string[]> {
  if (isDistributed()) {
    return listOpenRedis();
  }
  return listOpenMemory();
}