import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";
import { INhentaiRelated } from "../../interfaces/nhentai";
import { NhentaiV2RelatedResponse, NhentaiV2Tag } from "../../interfaces/nhentai-v2";
import { resolveTagMap, resolveUploadDateMap, formatUploadDate } from "./shared";


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchJson(url);
    const rawData = res as NhentaiV2RelatedResponse;
    const tagMap = await resolveTagMap(rawData.result);
    const uploadDateMap = await resolveUploadDateMap(rawData.result.map((item) => item.id));
    const content: INhentaiRelated[] = rawData.result.map((item) => {
      const resolvedTags = (item.tag_ids || [])
        .map((tagId) => tagMap.get(tagId))
        .filter((tag): tag is NhentaiV2Tag => Boolean(tag));
      const language = resolvedTags.find((tag) => tag.type === "language")?.name || "";
      const tags = resolvedTags
        .filter((tag) => tag.type === "tag")
        .map((tag) => tag.name);
      const upload_date = formatUploadDate(uploadDateMap.get(item.id));
      const pretty = item.english_title || item.japanese_title || "";

      return {
        title: {
          english: item.english_title || "",
          japanese: item.japanese_title || "",
          pretty,
        },
        id: item.id,
        language,
        upload_date,
        total: item.num_pages,
        tags,
      };
    });
    const endpoint = new globalThis.URL(url);

    const data = {
      success: true,
      data: content,
      source: `${c.NHENTAI}${endpoint.pathname}`,
    };
    return data;

  } catch (err) {
    if (err instanceof Error) {
      throw Error(err.message);
    }
    throw Error("Unknown error");
  }
}

