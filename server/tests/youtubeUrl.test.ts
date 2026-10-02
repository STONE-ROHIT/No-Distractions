import { describe, expect, it } from 'vitest';
import { parseYoutubeUrl } from '../src/utils/youtubeUrl.js';

describe('parseYoutubeUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'dQw4w9WgXcQ'],
  ])('recognizes a video URL: %s', (url, videoId) => {
    expect(parseYoutubeUrl(url)).toEqual({ type: 'video', videoId });
  });

  it('prefers v= over a list= on the same URL (a video link, not a playlist import)', () => {
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz')).toEqual({
      type: 'video',
      videoId: 'dQw4w9WgXcQ',
    });
  });

  it.each([
    ['https://www.youtube.com/playlist?list=PLxyz123', 'PLxyz123'],
    ['https://youtube.com/watch?list=PLxyz123', 'PLxyz123'],
  ])('recognizes a playlist URL: %s', (url, playlistId) => {
    expect(parseYoutubeUrl(url)).toEqual({ type: 'playlist', playlistId });
  });

  it('recognizes (and flags) a Shorts URL rather than treating it as an unknown link', () => {
    expect(parseYoutubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({
      type: 'shorts',
    });
  });

  it.each([
    ['not a url at all'],
    ['https://vimeo.com/12345'],
    ['https://www.youtube.com/'],
    ['https://www.youtube.com/watch?v=too-short'],
    ['https://www.youtube.com/channel/UCxyz'],
  ])('rejects %s', (url) => {
    expect(parseYoutubeUrl(url)).toBeNull();
  });
});
