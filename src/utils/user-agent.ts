import * as pkg from "../../package.json";

function runtimeBunVersion(): string {
  const bunFromGlobal = (globalThis as { Bun?: { version?: string } }).Bun?.version;
  return bunFromGlobal ?? process.versions.bun ?? "unknown";
}

/**
 * Default user agent string for upstream requests
 */
export function defaultUserAgent(): string {
  return `${pkg.name}/${pkg.version} Bun/${runtimeBunVersion()}`;
}

/**
 * Parse url — ensure protocol prefix
 */
export function getUrl(url: string) {
  return url.replace(/^\/\//, "https://");
}

/**
 * Parse id from url — strip protocol/host and trailing slash
 */
export function getId(url: string) {
  return url.replace(/^https?:\/\/[^\\/]+/, "").replace(/\/$/, "");
}