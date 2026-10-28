# YouTube Integration

Everything the app knows or does with YouTube goes through **official,
documented interfaces**. Nothing scrapes, proxies, or circumvents YouTube —
which also keeps this whole feature API-key-free.

## What We Use

| Need              | Mechanism                                                     | Key needed? |
| ----------------- | ------------------------------------------------------------- | ----------- |
| Play the video    | Official [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) embed | No |
| Title / channel / thumbnail | Public [oEmbed](https://www.youtube.com/oembed) endpoint | No |
| Thumbnail URL     | Documented `i.ytimg.com/vi/<id>/…` pattern                    | No |

## 1. URL Validation

Users paste a link; the app needs the 11-character video id. The parser
(`server/src/utils/youtube.js`, mirrored client-side in
`client/src/lib/youtube.js`) accepts:

- `https://www.youtube.com/watch?v=aircAruvnKk` (standard)
- `https://youtu.be/aircAruvnKk` (short links)
- `https://www.youtube.com/shorts/aircAruvnKk`, `/embed/…`, `/live/…`
- a bare id like `aircAruvnKk`

```js
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
```

The client parses for **instant feedback** ("that doesn't look like a
YouTube link"); the server parses again on every request, because client
checks are convenience, never security.

## 2. Metadata via oEmbed

`fetchVideoMetadata(videoId)` in `server/src/utils/youtube.js` calls:

```
https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=<id>
```

- 200 → `{ title, author_name, thumbnail_url }` — exactly what we store on
  the `LibraryItem`.
- 400/401/403/404 → the video does not exist, is private, or blocks
  embedding → the API answers the client with a friendly 404.
- Network failure → the route degrades gracefully: the video can still be
  saved with a fallback title and the documented thumbnail URL.

**Not available without an API key:** duration, description, view counts.
That is why `durationSec` on the library item starts at 0 and is filled in by
the player while you watch. oEmbed happens **server-side** so the client
never invents titles — the server is the single source of metadata truth.

## 3. The Player

`client/src/components/YouTubePlayer.jsx` wraps the IFrame API:

```js
player = new window.YT.Player(mountEl, {
  videoId,
  playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
  events: { onReady, onStateChange, onError },
})
```

Player parameters used — all documented, none circumvent anything:

- `rel: 0` — end-screen suggestions stay within the same channel (less
  distraction, still YouTube's own UI)
- `playsinline: 1` — don't take over the whole phone screen
- `modestbranding: 1` — reduced (not removed) YouTube branding

### Progress tracking

The component translates player events into two callbacks:

- `onStateChange` → `PLAYING` starts a 10-second interval that emits
  `onProgress(getCurrentTime(), getDuration())`; `PAUSED`/`ENDED` emit one
  final update. The watch page throttles these to one API call per ~5
  seconds of new position and sends `completed: true` when the video ends
  (the server also auto-completes at ≥95% as a backstop).
- `onReady` → if the saved `lastPositionSec` is meaningful (not <5s, not
  within 10s of the end), it calls `seekTo()` — this is the whole "resume"
  feature — and the page shows a "Resumed from 12:34" chip.

### Error mapping

YouTube's documented error codes become human messages:

| Code | Meaning in our UI                                |
| ---- | ------------------------------------------------ |
| 2    | The video request looks malformed.               |
| 5    | The video could not be played in this browser.   |
| 100  | This video does not exist or is private.         |
| 101/150 | The video owner does not allow it to be played here. |

### Notes ↔ player bridge

The watch page passes the raw player handle to the notes UI through a ref,
which is how "attach current time" (`getCurrentTime()`) and "click a
timestamp to jump back" (`seekTo()`) work without any player code living in
the notes component.

## What We Deliberately Do Not Do

- No downloading, caching, or offline copies of videos.
- No ad blocking or player modification beyond documented parameters — ads
  and YouTube's own UI inside the iframe behave exactly as on youtube.com.
- No scraping of private/unofficial endpoints, ever.

## Known Limitations

- Some videos disallow embedding (error 101/150) — they can still be saved
  and organized, but watching must happen on YouTube itself; the UI says so.
- Environments YouTube distrusts (e.g. datacenter IPs) may show a
  "confirm you're not a bot" screen inside the iframe — that is YouTube's
  call, not something this app can or should work around.
- Metadata refresh: if a video's title changes on YouTube, our stored copy
  keeps the old title until the video is removed and re-saved. Acceptable
  for the MVP.

## Optional: YouTube Data API v3 (Search & Playlist Import)

Phase 2 added two features that need more than oEmbed offers: **search**
and **playlist import**. Both use the official
[YouTube Data API v3](https://developers.google.com/youtube/v3) through
[`server/src/utils/youtube.js`](../server/src/utils/youtube.js) — never
from the browser, so the key never leaves the server.

### Configuration

Set `YOUTUBE_API_KEY` in `server/.env` (see `.env.example`): create a
project in the Google Cloud Console, enable "YouTube Data API v3", and
create an API key credential. **Without a key the app works normally** —
search and import answer `501 { configured: false }`, and the Discover
page explains how to enable them; link-pasting is unaffected. This
fail-open choice keeps local setups keyless.

### Quota Accounting

The Data API grants 10,000 units/day by default. Our calls cost:

| Call | Cost | Where |
| --- | --- | --- |
| `search.list` | **100** | `GET /api/videos/search` |
| `videos.list` | 1 | search follow-up (durations), import |
| `playlists.list` + `playlistItems.list` | 1+1 | import preview/import |

So ~100 searches/day on the free tier. Two protections:

- `rateLimit` middleware caps the search/import routes (10/min, 5/min) so
  a stuck tab cannot drain the quota — see
  [`docs/security.md`](security.md).
- HTTP 403 from Google is translated into a friendly 429 ("quota
  exhausted, try tomorrow") instead of a raw upstream error.

### Import Flow

`POST /api/playlists/import` fetches the playlist's first **50** videos
(one page — longer playlists are flagged `truncated: true`), saves each to
the user's library (deduping against already-saved videos), and collects
them into one new local playlist. Durations come from one `videos.list`
call, which is also why imported videos show their length immediately —
unlike oEmbed saves, which learn the duration on first watch.

### Compliance Boundaries (Unchanged)

The Data API usage changes *nothing* about the rules that matter:
official, documented endpoints only; no scraping; no stream extraction;
no downloading or rehosting; playback stays inside YouTube's iframe.
