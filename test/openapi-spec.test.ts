import { describe, expect, test } from "bun:test";
import { createOpenAPISpec } from "../src/lib/openapi-spec";

describe("OpenAPI server URL", () => {
  test("uses the request origin", () => {
    const spec = createOpenAPISpec("https://api.example.com/playground");

    expect(spec.servers).toEqual([
      {
        url: "https://api.example.com",
        description: "Current server",
      },
    ]);
  });
});
