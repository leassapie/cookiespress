import { load } from "cheerio";
import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";
import { getId } from "../../utils/modifier";

interface IHentai2readSearch {
  title: string;
  cover: string;
  id: string;
  link: string;
  message: string;
}


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchBody(url);
    const $ = load(res);
    const title = $(".title-text").map((i, el) => $(el).text()).get();
    const imgSrc = $("img").map((i, el) => $(el).attr("data-src")).get();
    const id = $(".overlay-title").map((i, el) => $(el).children("a").attr("href")).get();
    const idClean = id.map(el => getId(el));

    const content = title.map((item, i) => {
      const objectData: IHentai2readSearch = {
        title: item,
        cover: `${c.HENTAI2READ}${imgSrc[i]}`,
        id: idClean[i],
        link: `${c.HENTAI2READ}${idClean[i]}`,
        message: "Required chapter number is mandatory",
      };
      return objectData;
    });

    if (content.length === 0) throw Error("No result found");

    const data = {
      success: true,
      data: content,
      source: url,
    };
    return data;
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}