/**
 * Per-host concurrency limiter.
 * Prevents port exhaustion and upstream IP bans by capping
 * the number of concurrent outgoing HTTP requests per host.
 */

class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
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
  let sema = limits.get(host);
  if (!sema) {
    const max = DEFAULTS[host] ?? 10;
    sema = new Semaphore(max);
    limits.set(host, sema);
  }
  return sema.run(fn);
}