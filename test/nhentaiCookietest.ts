import got from "got";
import { nhentaiHeaders } from "../src/utils/nhentai";

async function test() {
  const res = await got("https://nhentai.net/api/v2/galleries?page=1&per_page=1", {
    headers: nhentaiHeaders(),
    throwHttpErrors: false,
    retry: { limit: 0 },
  });

  console.log(res.statusCode);
}

test().catch(console.error);
