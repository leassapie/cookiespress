import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";
import { defaultUserAgent, nhentaiHeaders } from "./utils/modifier";
import { logger } from "./utils/logger";
import { isCircuitOpen, recordFailure, recordSuccess } from "./utils/circuit-breaker";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const keyv = process.env.REDIS_URL
  ? new Keyv({ store: new KeyvRedis(process.env.REDIS_URL) })
  : new Keyv();
  
keyv.on("error", err => logger.error({ message: "Keyv connection error", error: (err as Error).message }));
const ttl = 1000 * 60 * 60 * (Number(process.env.EXPIRE_CACHE) || 1);
const GEO_TIMEOUT_MS = 3000;
const LOCATION_CACHE_MS = 60 * 60 * 1000;

let cachedLocation: { value: string; expiresAt: number } | null = null;


class JandaPress {
  url: string;
  useragent: string;
  constructor() {
    this.url = "";
    this.useragent = process.env.USER_AGENT || defaultUserAgent();
  }

  /**
   * Execute nhentai request against official API.
   * @param target url to fetch
   * @returns Promise<unknown>
   * @throws Error
   */
  async simulateNhentaiRequest(target: string): Promise<unknown> {
    const source = hostOf(target);
    if (isCircuitOpen(source)) {
      throw new Error(`${source} temporarily unavailable (circuit open)`);
    }
    try {
      const res = await fetch(target, {
        headers: nhentaiHeaders(),
        redirect: "follow"
      });
      if (!res.ok) {
        recordFailure(source);
        throw new Error(`Request failed with status ${res.status}`);
      }
      recordSuccess(source);
      return await res.json();
    } catch (err) {
      if (!(err as Error).message.includes("circuit open")) {
        recordFailure(source);
      }
      const e = err as Error;
      throw new Error(e.message);
    }
  }

  /**
     * Fetch body from url and check if it's cached
     * @param url url to fetch
     * @returns Buffer 
     */
  async fetchBody(url: string): Promise<Buffer> {
    const source = hostOf(url);
    if (isCircuitOpen(source)) {
      throw new Error(`${source} temporarily unavailable (circuit open)`);
    }

    const cached = await keyv.get(url);

    if (cached) {
      logger.debug({ message: "Fetching from cache", url });
      return cached;
    } else if (url.includes("/random")) {
      logger.debug({ message: "Random should not be cached", url });
      const res = await fetch(url, {
        headers: {
          "User-Agent": this.useragent,
        },
        redirect: "follow"
      });
      if (!res.ok) {
        recordFailure(source);
        throw new Error(`Request failed with status ${res.status}`);
      }
      recordSuccess(source);
      const body = Buffer.from(await res.arrayBuffer());
      return body;
    } else {
      logger.debug({ message: "Fetching from source", url });
      const res = await fetch(url, {
        headers: {
          "User-Agent": this.useragent,
        },
        redirect: "follow"
      });
      if (!res.ok) {
        recordFailure(source);
        throw new Error(`Request failed with status ${res.status}`);
      }
      recordSuccess(source);
      const body = Buffer.from(await res.arrayBuffer());
      await keyv.set(url, body, ttl);
      return body;
    }
  }

  /**
     * Fetch json from url and check if it's cached
     * @param url url to fetch
     * @returns Buffer
     */
  async fetchJson(url: string): Promise<unknown> {
    const cached = await keyv.get(url);

    if (cached) {
      logger.debug({ message: "Fetching from cache", url });
      return cached;
    } else {
      logger.debug({ message: "Fetching from source", url });
      const res = await this.simulateNhentaiRequest(url);
      await keyv.set(url, res, ttl);
      return res;
    }
  }

  currentProcess() {
    const rss = process.memoryUsage().rss / 1024 / 1024;
    const heap = process.memoryUsage().heapUsed / 1024 / 1024;
    const heaptotal = process.memoryUsage().heapTotal / 1024 / 1024;
    return {
      rss: `${Math.round(rss * 100) / 100} MB`,
      heap: `${Math.round(heap * 100) / 100}/${Math.round(heaptotal * 100) / 100} MB`
    };
  }

  async getServer(): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    try {
      // ip-api free tier often rejects HTTPS requests with 403;
      const raw = await fetch("https://ipwho.is/", {
        signal: controller.signal,
      });
      if (!raw.ok) {
        return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
      }
      const data = await raw.json() as {
        success?: boolean;
        country?: string;
        region?: string;
      };
      if (data.success === false) {
        return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
      }
      const country = data.country?.trim();
      const region = data.region?.trim();
      if (!country || !region) {
        return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
      }

      const location = `${country}, ${region}`;
      cachedLocation = { value: location, expiresAt: Date.now() + LOCATION_CACHE_MS };
      return location;
    } catch {
      return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }
    
  }
}

export default JandaPress;
export const janda = new JandaPress();
