const breakers = new Map<string, { failures: number; lastAttempt: number; openUntil: number }>();

const DEFAULT_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

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

export function recordFailure(source: string) {
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