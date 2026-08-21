import { load } from "cheerio";
import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";
import { ThreehentaiGetSchema, validateScraperOutput } from "../../utils/scraper-schemas";

interface IGet3hentai {
  title: string;
  id: number;
  tags: string[];
  total: number;
  image: string[];
  upload_date: string;
  
}

interface IData {
  success?: boolean;
  data: object;
  source: string;
}


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchBody(url);
    const $ = load(res);
    
    const urlId = new URL(url).pathname.match(/\/d\/(\d+)/)?.[1];
    const pageId = $("a[href*='/d/']").first().attr("href")?.match(/\/d\/(\d+)/)?.[1];
    const id = Number(urlId || pageId);
    if (!Number.isInteger(id) || id < 1) throw Error("Could not determine 3hentai gallery id");

    const title = $("h1").text();
    const tags = $("span.filter-elem")?.map((i, el) => $(el).text()).get();
    const tagsClean = tags.map((tag: string) => tag.replace(/<[^>]*>/g, "").replace(/\n/g, "").trim());
    const image = $("div.single-thumb-col")?.map((i, el) => $(el).find("img").attr("data-src")).get();
    if (image.length === 0) throw Error("No result found");

    const imageClean = image.map((img: string) => img.replace("t.", "."));
    const upload_date = $("time").text();

    const objectData: IGet3hentai = {
      title: title,
      id: id,
      tags: tagsClean.slice(0, tagsClean.length - 1),
      total: image.length,
      image: imageClean,
      upload_date: upload_date,
    };

    const data: IData = {
      success: true,
      data: objectData,
      source: `${c.THREEHENTAI}/d/${id}`,
    };
    return validateScraperOutput(ThreehentaiGetSchema, data, "3hentai");
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}