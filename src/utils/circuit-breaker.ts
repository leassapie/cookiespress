const breakers = new Map<string, { failures: number; lastAttempt: number; openUntil: number }>();

const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Decide whether an upstream error indicates the source itself is down.
 * 4xx client errors (404 nonexistent book, 400 bad params, 403 block) prove the
 * source is up and must NOT trip the breaker — otherwise 3 bogus requests could
 * take a healthy source offline for everyone. Transport errors (no HTTP response)
 * and 5xx/429 count as outages.
 */
export function isSourceOutage(err: unknown): boolean {
  const status = (err as { response?: { statusCode?: number } } | null)?.response?.statusCode;
  if (typeof status !== "number") return true;
  return status === 429 || status >= 500;
}

export function isCircuitOpen(source: string): boolean {
  const state = breakers.get(source);
  if (!state) return false;
  if (state.failures < DEFAULT_THRESHOLD) return false;
  if (Date.now() > state.openUntil) {
    state.failures = 0;
    return false;
  }
  return true;
}

export function recordSuccess(source: string) {
  breakers.delete(source);
}

export function recordFailure(source: string, err?: unknown) {
  if (err && !isSourceOutage(err)) return;
  let state = breakers.get(source);
  if (!state) {
    state = { failures: 0, lastAttempt: 0, openUntil: 0 };
    breakers.set(source, state);
  }
  state.failures += 1;
  state.lastAttempt = Date.now();
  if (state.failures >= DEFAULT_THRESHOLD) {
    state.openUntil = Date.now() + DEFAULT_COOLDOWN_MS;
    console.warn(`[circuit-breaker] ${source} opened (${state.failures} failures) — skipping for ${DEFAULT_COOLDOWN_MS / 1000}s`);
  }
}

// Human-readable list of currently open circuits, e.g. ["nhentai.net"]
export function getOpenCircuits(): string[] {
  const now = Date.now();
  const open: string[] = [];
  for (const [source, state] of breakers) {
    if (state.failures >= DEFAULT_THRESHOLD && now <= state.openUntil) {
      open.push(source);
    }
  }
  return open;
}