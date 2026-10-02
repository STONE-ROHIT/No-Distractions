import { describe, expect, it } from 'vitest';
import { parseIso8601Duration } from '../src/utils/isoDuration.js';

describe('parseIso8601Duration', () => {
  it.each([
    ['PT45S', 45],
    ['PT15M33S', 933],
    ['PT1H2M10S', 3730],
    ['PT2H', 7200],
    ['PT1M', 60],
  ])('parses %s as %i seconds', (iso, seconds) => {
    expect(parseIso8601Duration(iso)).toBe(seconds);
  });

  it('returns 0 for a live stream currently airing (no duration fields at all)', () => {
    expect(parseIso8601Duration('P0D')).toBe(0);
  });

  it('returns 0 rather than throwing on garbage input', () => {
    expect(parseIso8601Duration('not a duration')).toBe(0);
  });
});
