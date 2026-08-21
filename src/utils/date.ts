/**
 * Parse date format on nhentai
 * @param date
 * @returns string
 */
export function getDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Fancy time ago format
 * @param input
 * @returns string
 */
export function timeAgo(input: Date) {
  const date = new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges: Partial<Record<Intl.RelativeTimeFormatUnit, number>> = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1,
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  for (const key of Object.keys(ranges) as Intl.RelativeTimeFormatUnit[]) {
    const seconds = ranges[key];
    if (!seconds) continue;
    if (seconds < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / seconds;
      return formatter.format(Math.round(delta), key);
    }
  }
}