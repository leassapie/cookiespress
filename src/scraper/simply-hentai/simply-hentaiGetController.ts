import { load } from "cheerio";
import { janda } from "../../JandaPress";
import { SimplyHentaiGetSchema, validateScraperOutput } from "../../utils/scraper-schemas";

interface ISimplyHentaiGet {
  title: string;
  id: string;
  tags: string[];
  total: number;
  image: string[];
  language: string;
}


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchBody(url);
    const $ = load(res as Buffer);
    const script = $("script#__NEXT_DATA__");
    const json = JSON.parse(script.html() as string);
    const dataScrape = json.props.pageProps.data.pages;
    const images: string[] = Object.keys(dataScrape)
      .map((key: string) => dataScrape[key].sizes.full);
    const tagsRaw = json.props.pageProps.data.tags;
    const tags: string[] = Object.keys(tagsRaw).map((key: string) => tagsRaw[key].slug);
    const language = json.props.pageProps.data.language;
    const metaRaw= json.props.pageProps.meta;
   
    const objectData: ISimplyHentaiGet = {
      title: metaRaw.title,
      id: new URL(url).pathname.replace(/^\/|\/$/g, ""),
      tags: tags,
      total: images.length,
      image: images,
      language: language.slug
    };

    const data = {
      success: true,
      data: objectData,
      source: url,
    };
    return validateScraperOutput(SimplyHentaiGetSchema, data, "simply-hentai");
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}