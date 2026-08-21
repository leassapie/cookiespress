/**
 * Mock scraper HTTP responses for unit tests.
 * Import this before any scraper module to replace fetch with pre-recorded data.
 */

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

/**
 * Install a global mock fetch that returns fixture data instead of making real HTTP requests.
 * Call setupMockFetch() before importing scrapers, then restoreMockFetch() after the test.
 */
export function setupMockFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const fixture = getFixture(url);
    if (fixture) {
      return new Response(
        fixture.body instanceof Buffer
          ? fixture.body
          : typeof fixture.body === "string"
            ? fixture.body
            : JSON.stringify(fixture.body),
        { status: fixture.status },
      );
    }
    // No fixture — use real fetch (or fail in CI)
    return originalFetch(input, init);
  };
  return originalFetch;
}

export function restoreMockFetch(originalFetch: typeof globalThis.fetch) {
  globalThis.fetch = originalFetch;
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

// Sample HTML page for pururin gallery
export const PURURIN_HTML_FIXTURE = `<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Sample Pururin Gallery" />
  <meta property="og:image" content="https://pururin.me/assets/cover/12345.jpg" />
  <meta property="og:url" content="https://pururin.me/gallery/47226/janda" />
</head>
<body>
  <div class="content-wrapper">
    <ul class="list-inline">
      <li>futanari</li>
      <li>female-only</li>
    </ul>
  </div>
  <span itemprop="numberOfPages">10</span>
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