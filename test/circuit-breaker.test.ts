import { describe, expect, test } from "bun:test";
import { isCircuitOpen, isSourceOutage, recordFailure, recordSuccess } from "../src/utils/circuit-breaker";

// Got error shapes seen by JandaPress:
// - HTTPError carries `response.statusCode` (any non-2xx throws with throwHttpErrors: true)
// - transport errors (ECONNRESET, ENOTFOUND, ETIMEDOUT, ...) carry only `code`, no response
const httpError = (status: number) => ({
  name: "HTTPError",
  message: `Response code ${status} (Error)`,
  response: { statusCode: status, statusMessage: "Error", headers: {}, body: "", url: "https://3hentai.net/d/1" },
});
const transportError = (code: string) => ({
  name: "RequestError",
  code,
  message: `request failed: ${code}`,
});

describe("isSourceOutage", () => {
  test("4xx client errors mean the source is up, not down", () => {
    expect(isSourceOutage(httpError(400))).toBe(false);
    expect(isSourceOutage(httpError(403))).toBe(false);
    expect(isSourceOutage(httpError(404))).toBe(false);
  });

  test("429 and 5xx count as source failures", () => {
    expect(isSourceOutage(httpError(429))).toBe(true);
    expect(isSourceOutage(httpError(500))).toBe(true);
    expect(isSourceOutage(httpError(502))).toBe(true);
    expect(isSourceOutage(httpError(503))).toBe(true);
    expect(isSourceOutage(httpError(504))).toBe(true);
  });

  test("transport errors without an HTTP response count as source failures", () => {
    expect(isSourceOutage(transportError("ECONNRESET"))).toBe(true);
    expect(isSourceOutage(transportError("ETIMEDOUT"))).toBe(true);
    expect(isSourceOutage(transportError("ENOTFOUND"))).toBe(true);
  });

  test("classifies non-error payloads conservatively as outages", () => {
    expect(isSourceOutage(undefined)).toBe(true);
    expect(isSourceOutage("some string")).toBe(true);
  });
});

describe("recordFailure classification", () => {
  test("repeated 404s (nonexistent books) do NOT open the circuit", () => {
    recordFailure("3hentai.net", httpError(404));
    recordFailure("3hentai.net", httpError(404));
    recordFailure("3hentai.net", httpError(404));
    expect(isCircuitOpen("3hentai.net")).toBe(false);
    recordSuccess("3hentai.net");
  });

  test("repeated 5xx errors DO open the circuit", () => {
    recordFailure("3hentai.net", httpError(503));
    recordFailure("3hentai.net", httpError(503));
    expect(isCircuitOpen("3hentai.net")).toBe(false);
    recordFailure("3hentai.net", httpError(503));
    expect(isCircuitOpen("3hentai.net")).toBe(true);
    recordSuccess("3hentai.net");
    expect(isCircuitOpen("3hentai.net")).toBe(false);
  });

  test("recordFailure without an error keeps legacy counting behavior", () => {
    recordFailure("legacy-source");
    recordFailure("legacy-source");
    recordFailure("legacy-source");
    expect(isCircuitOpen("legacy-source")).toBe(true);
    recordSuccess("legacy-source");
  });
});