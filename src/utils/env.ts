import { z } from "zod";

/**
 * Validate required environment variables at startup.
 * Invalid or missing values cause a clear error instead of silent runtime failures.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  EXPIRE_CACHE: z.coerce.number().int().positive().default(1),
  JANDAPRESS_GRAPHQL: z.enum(["true", "false"]).default("false"),
  REDIS_URL: z.string().optional(),
  NHENTAI_API_KEY: z.string().optional(),
  USER_AGENT: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ALLOW_UNTRUSTED_PROXY_HEADERS: z.enum(["true", "false"]).default("false"),
  DEBUG: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}