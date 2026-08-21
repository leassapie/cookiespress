import type { HeaderReader } from "../interfaces/header-reader";

const TRUSTED_IP_HEADERS = ["cf-connecting-ip", "fly-client-ip", "x-vercel-forwarded-for", "x-client-ip"] as const;
const ALLOW_UNTRUSTED_PROXY_HEADERS = process.env.ALLOW_UNTRUSTED_PROXY_HEADERS === "true";

function firstIp(value: string): string {
  return value.split(",")[0]?.trim() ?? "unknown";
}

export function getIp(headers: HeaderReader): string {
  for (const header of TRUSTED_IP_HEADERS) {
    const candidate = headers.get(header);
    if (candidate) return firstIp(candidate);
  }
  if (ALLOW_UNTRUSTED_PROXY_HEADERS) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) return firstIp(forwarded);
    const realIp = headers.get("x-real-ip");
    if (realIp) return firstIp(realIp);
  }
  return "unknown";
}
