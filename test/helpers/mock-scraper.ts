/**
 * Mock scraper HTTP responses for unit tests.
 * Uses Bun's mock.module to replace `got` with pre-recorded data.
 *
 * Call setupMockGot() before importing scrapers, then restoreMockGot() after the test.
 */

import { mock } from "bun:test";

// Map of URL patterns → fixture responses
const FIXTURES = new Map<string, { body: unknown; ok: boolean; status: number }>();

export function registerFixture(urlPattern: string, body: unknown, ok = true, status = 200) {
  FIXTURES.set(urlPattern, { body, ok, status });
}

export function clearFixtures() {
  FIXTURES.clear();
}

export function getFixture(url: string): { body: unknown; ok: boolean; status: number } | undefined {
  // Exact match first
  if (FIXTURES.has(url)) return FIXTURES.get(url);
  // Pattern match (prefix)
  for (const [pattern, fixture] of FIXTURES) {
    if (url.startsWith(pattern)) return fixture;
  }
  return undefined;
}

function buildMockResponse(fixture: { body: unknown; ok: boolean; status: number }, url: string) {
  const bodyStr = fixture.body instanceof Buffer
    ? fixture.body
    : typeof fixture.body === "string"
      ? fixture.body
      : JSON.stringify(fixture.body);

  return {
    body: typeof bodyStr === "string" ? bodyStr : "",
    rawBody: typeof bodyStr === "string" ? Buffer.from(bodyStr) : bodyStr,
    statusCode: fixture.status,
    statusMessage: fixture.status === 200 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
    url,
    ok: fixture.ok,
    redirected: false,
    timings: { start: 0, socket: 0, lookup: 0, connect: 0, secureConnect: 0, upload: 0, response: 0, end: 0, error: 0, abort: 0, phases: { wait: 0, dns: 0, tcp: 0, tls: 0, request: 0, firstByte: 0, download: 0, total: 0 } },
    isFromCache: false,
    ip: "127.0.0.1",
    requestUrl: url,
    retryCount: 0,
    json: async () => {
      if (typeof bodyStr === "string") {
        return JSON.parse(bodyStr);
      }
      return bodyStr;
    },
    text: async () => typeof bodyStr === "string" ? bodyStr : bodyStr.toString(),
    buffer: async () => typeof bodyStr === "string" ? Buffer.from(bodyStr) : bodyStr,
    on: (..._args: unknown[]) => {},
  };
}

/**
 * Install a mock for the `got` module that returns fixture data instead of making real HTTP requests.
 * Call setupMockGot() before importing scrapers.
 */
export function setupMockGot() {
  mock.module("got", () => {
    const gotMock = async (url: string | URL, _options?: Record<string, unknown>) => {
      const urlStr = typeof url === "string" ? url : url.href;
      const fixture = getFixture(urlStr);
      if (fixture) {
        return buildMockResponse(fixture, urlStr);
      }
      throw new Error(`[mock-got] No fixture registered for: ${urlStr}`);
    };

    // Support got(url).json() / got(url).text() / got(url).buffer() chaining
    const gotProxy = new Proxy(gotMock, {
      get(_target, prop: string) {
        if (prop === "default") return gotProxy;
        if (prop === "get") return gotProxy;
        if (prop === "post") {
          return async (url: string | URL, options?: Record<string, unknown>) => {
            return gotMock(url, { ...options, method: "POST" });
          };
        }
        if (prop === "head") {
          return async (url: string | URL, options?: Record<string, unknown>) => {
            return gotMock(url, { ...options, method: "HEAD" });
          };
        }
        if (prop === "put") {
          return async (url: string | URL, options?: Record<string, unknown>) => {
            return gotMock(url, { ...options, method: "PUT" });
          };
        }
        if (prop === "delete") {
          return async (url: string | URL, options?: Record<string, unknown>) => {
            return gotMock(url, { ...options, method: "DELETE" });
          };
        }
        if (prop === "extend") {
          return () => gotProxy;
        }
        if (prop === "mergeOptions") {
          return (_defaults: unknown, options: unknown) => options;
        }
        return undefined;
      },
      apply(_target, _thisArg, args: [string | URL, Record<string, unknown>?]) {
        return gotMock(args[0], args[1]);
      },
    });

    return { default: gotProxy };
  });
}

/**
 * Restore the original `got` module by clearing the mock.
 * Note: Bun's mock.module persists for the lifetime of the test run.
 * This function clears fixtures so subsequent tests don't use stale data.
 */
export function restoreMockGot() {
  clearFixtures();
  // mock.module cannot be "un-done" in Bun, but clearing fixtures
  // ensures that stale fixture data doesn't leak into other tests.
  // The mock itself will delegate to fixtures; with no fixtures it throws.
  // To fully restore, re-import would be needed — but unit tests run
  // in isolation so this is acceptable.
}

// ─── Fixture data ───────────────────────────────────

// Sample nhentai v2 gallery response
export const NHENTAI_GET_FIXTURE = {
  id: 577774,
  media_id: "1980637",
  title: {
    english: "TFO-1 (Tsugou no Yoi Seiyoku Shori)",
    japanese: "TFO-1 (ツゴウノイイセイヨクショリ)",
    pretty: "TFO-1 (Tsugou no Yoi Seiyoku Shori)",
  },
  scanlator: "",
  upload_date: 1700000000,
  tags: [
    { id: 1, type: "tag", name: "futanari", url: "/tag/futanari", count: 100 },
    { id: 2, type: "artist", name: "artist-x", url: "/artist/artist-x", count: 10 },
    { id: 3, type: "language", name: "english", url: "/language/english", count: 1000 },
    { id: 4, type: "parody", name: "original", url: "/parody/original", count: 500 },
    { id: 5, type: "character", name: "character-x", url: "/character/character-x", count: 50 },
    { id: 6, type: "group", name: "group-x", url: "/group/group-x", count: 20 },
  ],
  num_pages: 25,
  num_favorites: 500,
  pages: [
    { number: 1, path: "1.jpg", width: 800, height: 1200, thumbnail: "1t.jpg", thumbnail_width: 175, thumbnail_height: 262 },
    { number: 2, path: "2.jpg", width: 800, height: 1200, thumbnail: "2t.jpg", thumbnail_width: 175, thumbnail_height: 262 },
  ],
};

// Sample HTML page for hentai2read gallery
export const HENTAI2READ_GET_FIXTURE = `<html><script>
window.gData = {"images":["/1.jpg"],"title":"Sample Hentai2read Gallery","mainURL":"https://hentai2read.com/sample/","currentURL":"https://hentai2read.com/sample/1/","nextURL":"https://hentai2read.com/sample/2/"};
</script></html>`;

// Sample HTML page for hentaifox gallery
export const HENTAIFOX_GET_FIXTURE = `<!DOCTYPE html>
<html>
<head>
  <title>Sample Hentaifox Gallery</title>
</head>
<body>
  <a class="g_button" href="/g/59026/1/"></a>
  <a class="tag_btn">futanari 12</a>
  <a class="tag_btn">stockings 34</a>
  <img src="https://i2.hentaifox.com/002/1410010/cover.jpg">
  <img data-src="https://i2.hentaifox.com/002/1410010/1t.jpg">
  <img data-src="https://i2.hentaifox.com/002/1410010/2t.jpg">
  <span class="i_text pages">Pages: 3</span>
  <div class="info">
    <h1>Sample Hentaifox Gallery</h1>
  </div>
</body>
</html>`;

// Sample HTML page for asmhentai gallery
export const ASMHENTAI_GET_FIXTURE = `<!DOCTYPE html>
<html>
<head>
  <title>Sample Asmhentai Gallery</title>
</head>
<body>
  <div class="cover">
    <a href="/gallery/308830/1/"></a>
  </div>
  <h1>Sample Asmhentai Gallery</h1>
  <span class="badge tag">futanari (17,459)</span>
  <span class="badge tag">stockings (105,787)</span>
  <input id="t_pages" value="2">
  <img data-src="//images.asmhentai.com/010/308830/cover.jpg">
  <div class="pages">
    <h3>Pages: 2</h3>
  </div>
</body>
</html>`;

// Sample 3hentai HTML page
export const THREEHENTAI_HTML_FIXTURE = `<!DOCTYPE html>
<html>
<head>
  <title>Sample 3hentai Gallery</title>
</head>
<body>
  <div id="main-cover">
    <a href="/d/608979"></a>
  </div>
  <h1>Sample Title</h1>
  <span class="filter-elem">futanari</span>
  <span class="filter-elem">female-only</span>
  <div class="single-thumb-col">
    <img data-src="https://example.com/1t.jpg" />
  </div>
  <time>2024-01-01</time>
</body>
</html>`;