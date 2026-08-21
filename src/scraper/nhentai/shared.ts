import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";
import { getDate, timeAgo } from "../../utils/date";
import { NhentaiV2Detail, NhentaiV2GallerySummary, NhentaiV2Tag } from "../../interfaces/nhentai-v2";

/**
 * Resolve tag metadata for a list of galleries.
 * Fetches tags in chunks of 80 ids. Returns an empty map when the endpoint is flaky.
 */
export async function resolveTagMap(items: NhentaiV2GallerySummary[]): Promise<Map<number, NhentaiV2Tag>> {
  const ids = Array.from(
    new Set(items.flatMap((item) => item.tag_ids || [])),
  );

  if (ids.length === 0) {
    return new Map<number, NhentaiV2Tag>();
  }

  const CHUNK_SIZE = 80;
  const tagMap = new Map<number, NhentaiV2Tag>();

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const endpoint = `${c.NHENTAI}/api/v2/tags/ids?ids=${chunk.join(",")}`;

    try {
      const res = await janda.fetchJson(endpoint);
      const tags = res as NhentaiV2Tag[];
      for (const tag of tags) {
        tagMap.set(tag.id, tag);
      }
    } catch {
      // Keep response compatible even when tag resolve endpoint is flaky.
    }
  }

  return tagMap;
}

/**
 * Resolve upload timestamps for gallery ids.
 * Fetches details in chunks of 5 ids (parallel within a chunk).
 */
export async function resolveUploadDateMap(ids: number[]): Promise<Map<number, number>> {
  const uploadDateMap = new Map<number, number>();
  const CHUNK_SIZE = 5;

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const chunkResponses = await Promise.all(
      chunk.map(async (id) => {
        try {
          const endpoint = `${c.NHENTAI}/api/v2/galleries/${id}`;
          const res = await janda.fetchJson(endpoint);
          const detail = res as Pick<NhentaiV2Detail, "upload_date">;
          return { id, upload_date: detail.upload_date };
        } catch {
          return null;
        }
      }),
    );

    for (const row of chunkResponses) {
      if (!row || !Number.isFinite(row.upload_date)) continue;
      uploadDateMap.set(row.id, row.upload_date);
    }
  }

  return uploadDateMap;
}

export function formatUploadDate(unixSeconds?: number): string {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return "";
  const time = new Date(unixSeconds * 1000);
  return `${getDate(time)} (${timeAgo(time)})`;
}