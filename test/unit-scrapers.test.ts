/// <reference types="bun" />
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import {
  clearFixtures,
  HENTAI2READ_GET_FIXTURE,
  NHENTAI_GET_FIXTURE,
  THREEHENTAI_HTML_FIXTURE,
  registerFixture,
  restoreMockGot,
  setupMockGot,
} from "./helpers/mock-scraper";

beforeAll(() => {
  clearFixtures();

  // nhentai v2 gallery (used by /get)
  registerFixture("https://nhentai.net/api/v2/galleries/577774", NHENTAI_GET_FIXTURE);

  // hentai2read gallery page
  registerFixture("https://hentai2read.com/sample/1", HENTAI2READ_GET_FIXTURE);

  // 3hentai gallery and random pages
  registerFixture("https://3hentai.net/d/608979", THREEHENTAI_HTML_FIXTURE);
  registerFixture("https://3hentai.net/random", THREEHENTAI_HTML_FIXTURE);

  setupMockGot();
});

afterAll(() => {
  restoreMockGot();
});

describe("nhentai get scraper", () => {
  test("parses v2 gallery JSON into normalized shape", async () => {
    const { scrapeContent } = await import("../src/scraper/nhentai/nhentaiGetController");
    const result = await scrapeContent("https://nhentai.net/api/v2/galleries/577774");

    expect(result.success).toBe(true);
    const data = result.data as { id: number; title: string; tags: string[]; total: number; language: string; image: string[] };
    expect(data.id).toBe(577774);
    expect(data.title).toContain("TFO-1");
    expect(data.tags).toContain("futanari");
    expect(data.language).toBe("english");
    expect(data.total).toBe(2);
    expect(Array.isArray(data.image)).toBe(true);
  });

  test("rejects malformed output via Zod validation", async () => {
    // Fixture missing required title → validation should throw
    registerFixture("https://nhentai.net/api/v2/galleries/999", {
      ...NHENTAI_GET_FIXTURE,
      title: { english: "", japanese: "", pretty: "" },
    });

    const { scrapeContent } = await import("../src/scraper/nhentai/nhentaiGetController");
    await expect(
      scrapeContent("https://nhentai.net/api/v2/galleries/999"),
    ).rejects.toThrow(/nhentai scraper output invalid/);
  });
});

describe("hentai2read get scraper", () => {
  test("parses window.gData assignment", async () => {
    const { scrapeContent } = await import("../src/scraper/hentai2read/hentai2readGetController");
    const result = await scrapeContent("https://hentai2read.com/sample/1");

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Sample Hentai2read Gallery");
    expect(result.data?.image).toEqual(["https://cdn-ngocok-static.sinxdr.workers.dev/hentai/1.jpg"]);
  });
});

describe("3hentai get scraper", () => {
  test("parses HTML into normalized shape", async () => {
    const { scrapeContent } = await import("../src/scraper/3hentai/3hentaiGetController");
    const result = await scrapeContent("https://3hentai.net/d/608979");

    expect(result.success).toBe(true);
    const data = result.data as { title: string; id: number; tags: string[]; total: number };
    expect(data.title).toBe("Sample Title");
    expect(data.id).toBe(608979);
    expect(data.tags).toEqual(expect.arrayContaining(["futanari"]));
    expect(data.total).toBe(1);
  });

  test("uses gallery id from random page link", async () => {
    const { scrapeContent } = await import("../src/scraper/3hentai/3hentaiGetController");
    const result = await scrapeContent("https://3hentai.net/random");

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(608979);
  });
});