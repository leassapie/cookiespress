import { load } from "cheerio";
import { janda } from "../../JandaPress";
import { SITES as c } from "../../utils/constants";

interface IHentaiFoxSearch {
  title: string;
  cover: string;
  id: number;
  language: string;
  category: string;
  link: string;
}


export async function scrapeContent(url: string) {
  try {
    const res = await janda.fetchBody(url);
    const $ = load(res);

    const title = $("h2.g_title").map((i, abc) => {
      return $(abc).text();
    }).get();

    const link = $("h2.g_title").map((i, abc) => {
      //return number only
      return $(abc)?.children("a")?.attr("href")?.split("/")[2];
    }).get();

    const category = $("h3.g_cat").map((i, abc) => {
      return $(abc)?.children("a")?.attr("href")?.split("/")[2];
    }).get();

    const imgSrc = $("img").map((i, el) => $(el).attr("data-cfsrc")).get();
    const imgSrcClean = imgSrc.slice(0, imgSrc.length - 1);
    
    const content = title.map((item, i) => {
      const objectData: IHentaiFoxSearch = {
        title: item,
        cover: imgSrcClean[i],
        id: parseInt(link[i]),
        language: "Translated",
        category: category[i],
        link: `${c.HENTAIFOX}/gallery/${link[i]}`,
      };
      return objectData;
    });

    if (content.length === 0) throw Error("No result found");
    

    const data = {
      success: true,
      data: content.filter(con => con.category !== ""),
      page: Number(new URL(url).searchParams.get("page") || 1),
      sort: new URL(url).searchParams.get("sort") || "latest",
      source: url,
    };
    return data;
  } catch (err) {
    const e = err as Error;
    throw Error(e.message);
  }
}