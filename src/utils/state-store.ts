/**
 * Shared state store that uses Redis when REDIS_URL is set, otherwise in-memory.
 * Used by the rate limiter and circuit breaker for distributed state across instances.
 */
import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";

let store: Keyv | null = null;

export function getStateStore(): Keyv {
  if (!store) {
    const url = process.env.REDIS_URL;
    store = url
      ? new Keyv({ store: new KeyvRedis(url) })
      : new Keyv();
  }
  return store;
}

/**
 * Whether Redis-backed distributed state is active.
 */
export function isDistributed(): boolean {
  return !!process.env.REDIS_URL;
}