import { load } from "cheerio";
import got from "got";
import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";
import { HentaifoxGetSchema, validateScraperOutput } from "../../utils/scraper-schemas";
import { logger } from "../../utils/logger";
import { withConcurrencyLimit } from "../../utils/concurrency-limiter";

interface IHentaiFoxGet {
  title: string;
  id: number;
  tags: string[];
  type: string;
  total: number;
  image: string[];
}

function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return "unknown"; }
}

/**
 * Predict the extension of hentaiFox images by HEAD request.
 */
async function hentaiFoxPredictedExtension(url: string): Promise<".jpg" | ".webp"> {
  try {
    const res = await withConcurrencyLimit(hostOf(url), () =>
      got(url, {
        method: "HEAD",
        throwHttpErrors: false,
        retry: { limit: 0 },
        timeout: { request: 10_000, connect: 5_000 },
      }),
    );
    return res.statusCode === 200 ? ".jpg" : ".webp";
  } catch (err) {
    logger.error({ message: "hentaiFox extension prediction failed", error: (err as Error).message });
    return ".webp";
  }
}


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchBody(url);
    const $ = load(res);
    const id = parseInt($("a.g_button")?.attr("href")?.split("/")[2] || "");

    const category = $("a.tag_btn").map((i, abc) => {
      return $(abc)?.text()?.replace(/[0-9]/g, "").trim();
    }).get();

    const imgSrc = $("img").map((i, el) => $(el).attr("data-src")).get();
    if (!imgSrc.length) throw Error("No images found");
    const img1_clean = imgSrc[0].replace(/\/\d+$/, "");
    const extPredict = img1_clean.replace("t.", ".");
    const extPredicted = await hentaiFoxPredictedExtension(extPredict);
    // console.log("Extension Predicted:", extPredicted);

    const parameterImg2 = imgSrc[0].split("/").slice(0, 5).join("/");
    const extensionImg = extPredicted;

    const info = $("span.i_text.pages").map((i, abc) => {
      return $(abc).text();
    }).get();

    const pageCount = parseInt(info[0].replace(/[^0-9]/g, ""));
    const image = [];
    for (let i = 0; i < Number(pageCount); i++) {
      image.push(`${parameterImg2}/${i + 1}${extensionImg}`);
    }
    const titleInfo = $("div.info").children("h1").text();

    const objectData: IHentaiFoxGet = {
      title: titleInfo,
      id: id,
      tags: category,
      type: extensionImg,
      total: pageCount,
      image: image,
    };

    const data = {
      success: true,
      data: objectData,
      source: `${c.HENTAIFOX}/gallery/${id}/`,
    };
    return validateScraperOutput(HentaifoxGetSchema, data, "hentaifox");
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}