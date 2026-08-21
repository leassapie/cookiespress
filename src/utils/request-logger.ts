import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types/hono-bindings";
import { getIp } from "./get-ip";
import { logger } from "./logger";

/**
 * Log every request after it completes.
 * Error responses are logged by app.onError, but this middleware also
 * captures them for a complete access log.
 */
export const requestLogger: MiddlewareHandler<AppBindings> = async (c, next) => {
  await next();

  const status = c.res.status;
  logger.info({
    path: c.req.path,
    method: c.req.method,
    status,
    ip: getIp(c.req.raw.headers),
    useragent: c.req.header("User-Agent"),
  });
};