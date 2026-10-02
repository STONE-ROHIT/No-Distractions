const ISO_8601_DURATION = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

/**
 * The YouTube Data API reports video length as an ISO 8601 duration
 * (`PT1H2M10S`, `PT15M33S`, `PT45S` — a live stream currently airing can
 * report a bare `P0D`, with none of the time fields present at all).
 * Returns 0 for anything that doesn't match rather than throwing — an
 * unparseable duration shouldn't fail an entire import.
 */
export function parseIso8601Duration(iso: string): number {
  const match = ISO_8601_DURATION.exec(iso);
  if (!match) return 0;

  const [, hours, minutes, seconds] = match;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}
