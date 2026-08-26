import { describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { validateEnv } from "../src/utils/env";

describe("limiter environment configuration", () => {
  test("enables all limiters by default", () => {
    const previous = {
      rate: process.env.RATE_LIMIT_ENABLED,
      slow: process.env.SLOW_DOWN_ENABLED,
      concurrency: process.env.CONCURRENCY_LIMIT_ENABLED,
    };
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.SLOW_DOWN_ENABLED;
    delete process.env.CONCURRENCY_LIMIT_ENABLED;

    const env = validateEnv();

    expect(env.RATE_LIMIT_ENABLED).toBe("true");
    expect(env.SLOW_DOWN_ENABLED).toBe("true");
    expect(env.CONCURRENCY_LIMIT_ENABLED).toBe("true");

    if (previous.rate === undefined) delete process.env.RATE_LIMIT_ENABLED;
    else process.env.RATE_LIMIT_ENABLED = previous.rate;
    if (previous.slow === undefined) delete process.env.SLOW_DOWN_ENABLED;
    else process.env.SLOW_DOWN_ENABLED = previous.slow;
    if (previous.concurrency === undefined) delete process.env.CONCURRENCY_LIMIT_ENABLED;
    else process.env.CONCURRENCY_LIMIT_ENABLED = previous.concurrency;
  });

  test("bypasses inbound limiters when disabled at startup", async () => {
    const script = `
      import { Hono } from "hono";
      import { limiter, slow } from "./src/utils/limit-options";
      const app = new Hono();
      app.get("/", slow, limiter, (c) => c.text("ok"));
      const responses = await Promise.all(
        Array.from({ length: 55 }, () => app.request("http://localhost/")),
      );
      console.log(JSON.stringify({
        statuses: [...new Set(responses.map((response) => response.status))],
        rateLimitHeader: responses[0]?.headers.get("X-RateLimit-Limit"),
      }));
    `;
    const proc = spawn(["bun", "-e", script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RATE_LIMIT_ENABLED: "false",
        SLOW_DOWN_ENABLED: "false",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(JSON.parse(output)).toEqual({ statuses: [200], rateLimitHeader: null });
  });

  test("bypasses concurrency limiting when disabled at startup", async () => {
    const script = `
      import { withConcurrencyLimit } from "./src/utils/concurrency-limiter";
      let running = 0;
      let peak = 0;
      const work = () => withConcurrencyLimit("test-host", async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running--;
      });
      await Promise.all(Array.from({ length: 11 }, work));
      console.log(peak);
    `;
    const proc = spawn(["bun", "-e", script], {
      cwd: process.cwd(),
      env: { ...process.env, CONCURRENCY_LIMIT_ENABLED: "false" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(output.trim()).toBe("11");
  });

  test("rejects invalid limiter toggle values", () => {
    const previous = process.env.RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = "yes";

    expect(() => validateEnv()).toThrow("RATE_LIMIT_ENABLED");

    if (previous === undefined) delete process.env.RATE_LIMIT_ENABLED;
    else process.env.RATE_LIMIT_ENABLED = previous;
  });
});
