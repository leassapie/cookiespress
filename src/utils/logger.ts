type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isSilent = (process.env.RUN_MODE || "debug").toLowerCase() === "prod";

function currentLevel(): number {
  const configured = (process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVEL_ORDER[configured as LogLevel] ?? LEVEL_ORDER.info;
}

function noop(_payload: unknown) {
  /* silent in prod mode */
}

function emit(level: LogLevel, payload: unknown) {
  if (isSilent) return;
  if (LEVEL_ORDER[level] < currentLevel()) return;

  const timestamp = new Date().toISOString();
  const line = JSON.stringify({
    timestamp,
    level,
    ...(payload && typeof payload === "object" ? payload : { message: payload }),
  });

  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: isSilent ? noop : (payload: unknown) => emit("debug", payload),
  info: isSilent ? noop : (payload: unknown) => emit("info", payload),
  warn: isSilent ? noop : (payload: unknown) => emit("warn", payload),
  error: isSilent ? noop : (payload: unknown) => emit("error", payload),
};