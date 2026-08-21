import got from "got";
import { logger } from "./logger";

/**
 * Predict the extension of hentaiFox images
 * @param url
 * @returns Promise<".jpg" | ".webp"> lolz
 */
export async function hentaiFoxPredictedExtension(url: string): Promise<".jpg" | ".webp"> {
  try {
    const jpgUrl = url;
    const res = await got(jpgUrl, {
      method: "HEAD",
      throwHttpErrors: false,
      retry: { limit: 0 },
      timeout: { request: 10_000, connect: 5_000 },
    });

    if (res.statusCode === 200) {
      return ".jpg";
    } else {
      return ".webp";
    }
  } catch (err) {
    const e = err as Error;
    logger.error({ message: "hentaiFox extension prediction failed", error: e.message });
    return ".webp";
  }
}