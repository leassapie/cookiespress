import got from "got";
import { nhentaiHeaders } from "../src/utils/modifier";

const url = "https://nhentai.net";

async function test() {
  const headers = nhentaiHeaders();
  console.log("[test/nh.ts] Authorization header:", headers.Authorization ? "present" : "missing");

  const res = await got(`${url}/api/v2/galleries/1`, {
    headers,
    throwHttpErrors: false,
    retry: { limit: 0 },
  });

  console.log(res.statusCode);
  console.log(JSON.parse(res.body));
}

test().catch(console.error);
