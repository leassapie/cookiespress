import { load } from "cheerio";
import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";
import { Hentai2readGetSchema, validateScraperOutput } from "../../utils/scraper-schemas";

interface IHentai2readGet {
  title: string;
  id: string;
  image: string[];
}

interface IHentai2readGetPush {
  data: object;
  main_url: string;
  current_url: string;
  next_url?: string;
  previus_url?: string;

}


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchBody(url);
    const $ = load(res);
    const script = $("script").map((i, el) => $(el).text()).get();

    const gDataScript = script.find(el => /(?:\b(?:var|let|const)\s+|(?:window\.)?)gData\s*=/.test(el));
    if (!gDataScript) throw Error("Could not find gData in page scripts");

    const gDataMatch = gDataScript.match(/(?:\b(?:var|let|const)\s+|(?:window\.)?)gData\s*=\s*([\s\S]*?);\s*(?:\n|$)/);
    if (!gDataMatch?.[1]) throw Error("Could not extract gData from page scripts");

    const gDataClean = gDataMatch[1].replace(/'/g, "\"");
    let gDataJson: { images: string[]; title: string; mainURL: string; currentURL: string; nextURL?: string; previousURL?: string };
    try {
      gDataJson = JSON.parse(gDataClean);
    } catch {
      throw Error("Failed to parse gData from page");
    }
    const images = gDataJson.images.map((el) => `${c.HENTAI2READ_CDN}${el}`);

    const id = new URL(url).pathname.replace(/^\/|\/$/g, "");

    const objectData: IHentai2readGet = {
      title: gDataJson.title,
      id,
      image: images
    };

    const objectDataPush: IHentai2readGetPush = {
      data: objectData,
      main_url: gDataJson.mainURL,
      current_url: gDataJson.currentURL,
      next_url: gDataJson.nextURL,
      previus_url: gDataJson.previousURL
    };

    const data = {
      success: true,
      ...objectDataPush,
      source: `${c.HENTAI2READ}/${id}`,
    };

    return validateScraperOutput(Hentai2readGetSchema, data, "hentai2read");
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}