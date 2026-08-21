import { janda } from "../../JandaPress";
import { NhentaiSearchSchema, validateScraperOutput } from "../../utils/scraper-schemas";
import { SITES as c } from "../../utils/constants";
import { INhentaiSearch } from "../../interfaces/nhentai";
import { NhentaiV2ListResponse, NhentaiV2Tag } from "../../interfaces/nhentai-v2";
import { resolveTagMap, resolveUploadDateMap, formatUploadDate } from "./shared";


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchJson(url);
    const rawData = res as NhentaiV2ListResponse;
    const tagMap = await resolveTagMap(rawData.result);
    const uploadDateMap = await resolveUploadDateMap(rawData.result.map((item) => item.id));
    const content: INhentaiSearch[] = rawData.result.map((item) => {
      const resolvedTags = (item.tag_ids || [])
        .map((tagId) => tagMap.get(tagId))
        .filter((tag): tag is NhentaiV2Tag => Boolean(tag));
      const language = resolvedTags.find((tag) => tag.type === "language")?.name || "";
      const tags = resolvedTags
        .filter((tag) => tag.type === "tag")
        .map((tag) => tag.name);
      const upload_date = formatUploadDate(uploadDateMap.get(item.id));

      return {
        title: {
          english: item.english_title || "",
          japanese: item.japanese_title || "",
          pretty: item.english_title || item.japanese_title || "",
        },
        id: item.id,
        language,
        upload_date,
        total: item.num_pages,
        cover: item.thumbnail,
        tags,
      };
    });
    const endpoint = new globalThis.URL(url);
    const page = Number(endpoint.searchParams.get("page") || 1);
    const sort = endpoint.searchParams.get("sort") || "date";

    const data = {
      success: true,
      data: content,
      page,
      sort,
      source: `${c.NHENTAI}${endpoint.pathname}`,
    };
    return validateScraperOutput(NhentaiSearchSchema, data, "nhentai");

  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}

