/**
 * Per-host concurrency limiter.
 * Prevents port exhaustion and upstream IP bans by capping
 * the number of concurrent outgoing HTTP requests per host.
 *
 * Includes a queue timeout to prevent requests from waiting indefinitely
 * when the semaphore is saturated under extreme load.
 */

import { validateEnv } from "./env";

const { CONCURRENCY_LIMIT_ENABLED } = validateEnv();
const QUEUE_TIMEOUT_MS = 10_000;

class Semaphore {
  private current = 0;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove this entry from the queue on timeout
        const idx = this.queue.findIndex((e) => e.resolve === resolve);
        if (idx !== -1) this.queue.splice(idx, 1);
        reject(new Error("Service busy, please try again later"));
      }, QUEUE_TIMEOUT_MS);

      this.queue.push({
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next.resolve();
    } else {
      this.current--;
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

const limits = new Map<string, Semaphore>();

const DEFAULTS: Record<string, number> = {
  "nhentai.net": 15,
  "hentaifox.com": 10,
  "asmhentai.com": 10,
  "hentai2read.com": 10,
  "3hentai.net": 10,
  "ipwho.is": 2,
};

export function withConcurrencyLimit<T>(host: string, fn: () => Promise<T>): Promise<T> {
  if (CONCURRENCY_LIMIT_ENABLED === "false") return fn();

  let sema = limits.get(host);
  if (!sema) {
    const max = DEFAULTS[host] ?? 10;
    sema = new Semaphore(max);
    limits.set(host, sema);
  }
  return sema.run(fn);
}