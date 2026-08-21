/// <reference types="bun" />
import got from "got";
import { expect, test } from "bun:test";
import { SITES as c } from "../src/utils/constants";
import { name, version } from "../package.json";

const UA = `${name}/${version} Bun/1.3.14`;

const sources = [
  c.NHENTAI,
  c.HENTAIFOX,
  c.ASMHENTAI,
  c.HENTAI2READ,
  c.THREEHENTAI
];

function getKeyByValue(data: Record<string, string>, value: string) {
  return Object.keys(data).find(k => data[k] === value);
}

async function check(url: string) {
  const res = await got(url, {
    headers: { "User-Agent": UA },
    throwHttpErrors: false,
    retry: { limit: 0 },
  });

  const ok = [200, 301, 308].includes(res.statusCode);

  console.log(`${url} → ${res.statusCode}`);

  expect(ok).toBe(true);
}

for (const url of sources) {
  test(`source: ${getKeyByValue(c, url)}`, async () => {
    await check(url);
  });
}