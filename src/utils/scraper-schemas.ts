import { z } from "zod";

// ─── Shared envelope ─────────────────────────────────

export const SourceEnvelopeSchema = z.object({
  success: z.boolean(),
  source: z.string(),
  data: z.unknown(),
});

// ─── nhentai ─────────────────────────────────────────

export const NhentaiGetSchema = z.object({
  success: z.literal(true),
  data: z.object({
    title: z.string().min(1),
    optional_title: z.object({
      english: z.string().nullable(),
      japanese: z.string().nullable(),
      pretty: z.string().nullable(),
    }),
    id: z.number().int().positive(),
    language: z.string(),
    tags: z.array(z.string()),
    total: z.number().int().nonnegative(),
    image: z.array(z.string()).min(1),
    num_pages: z.number().int().nonnegative(),
    num_favorites: z.number().int().nonnegative(),
    artist: z.array(z.string()),
    group: z.string(),
    parodies: z.array(z.string()),
    characters: z.array(z.string()),
    upload_date: z.string(),
  }),
  source: z.string(),
});

export const NhentaiSearchItemSchema = z.object({
  title: z.object({
    english: z.string(),
    japanese: z.string(),
    pretty: z.string(),
  }),
  id: z.number().int().positive(),
  language: z.string(),
  upload_date: z.string(),
  total: z.number().int().nonnegative(),
  cover: z.string(),
  tags: z.array(z.string()),
});

export const NhentaiSearchSchema = z.object({
  success: z.literal(true),
  data: z.array(NhentaiSearchItemSchema),
  page: z.number(),
  sort: z.string(),
  source: z.string(),
});

// ─── hentaifox ───────────────────────────────────────

export const HentaifoxGetSchema = z.object({
  success: z.literal(true),
  data: z.object({
    title: z.string().min(1),
    id: z.number().int().positive(),
    tags: z.array(z.string()),
    type: z.string(),
    total: z.number().int().nonnegative(),
    image: z.array(z.string()),
  }),
  source: z.string(),
});

// ─── asmhentai ───────────────────────────────────────

export const AsmhentaiGetSchema = z.object({
  success: z.literal(true),
  data: z.object({
    title: z.string().min(1),
    id: z.number().int().positive(),
    tags: z.array(z.string()),
    total: z.number().int().nonnegative(),
    image: z.array(z.string()),
    upload_date: z.string(),
  }),
  source: z.string(),
});

// ─── hentai2read ─────────────────────────────────────

export const Hentai2readGetSchema = z.object({
  success: z.literal(true),
  data: z.object({
    title: z.string().min(1),
    id: z.string().min(1),
    image: z.array(z.string()),
  }),
  main_url: z.string(),
  current_url: z.string(),
  next_url: z.string().optional(),
  previus_url: z.string().optional(),
  source: z.string(),
});

// ─── 3hentai ─────────────────────────────────────────

export const ThreehentaiGetSchema = z.object({
  success: z.literal(true),
  data: z.object({
    title: z.string().min(1),
    id: z.number().int().positive(),
    tags: z.array(z.string()),
    total: z.number().int().nonnegative(),
    image: z.array(z.string()),
    upload_date: z.string(),
  }),
  source: z.string(),
});

// ─── Validation helper ───────────────────────────────

export function validateScraperOutput<T>(schema: z.ZodType<T>, output: unknown, source: string): T {
  const result = schema.safeParse(output);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`${source} scraper output invalid: ${issues}`);
  }
  return result.data;
}