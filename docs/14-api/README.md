# 14 · API Reference

## REST, briefly

This API follows REST conventions: URLs name *resources*
(`/api/users/me`, not `/api/getCurrentUser`), and the HTTP method says
what to do to that resource (`GET` = read, `POST` = create, `PATCH` =
partially update, `DELETE` = remove). Status codes carry meaning: `2xx`
success, `4xx` the client's request was the problem (bad input, not
logged in, not allowed), `5xx` the server's problem.

Every error response — from any endpoint — has the same shape:

```json
{ "error": { "message": "human-readable explanation" } }
```

## Auth endpoints

### `POST /api/auth/register`

Creates an account and starts a session.

| | |
|---|---|
| Auth required | No |
| Rate limited | Yes — 10 requests / 15 min / IP, tracked separately per endpoint |
| Body | `{ name: string, email: string, password: string }` (password ≥ 8 chars) |
| 201 | `{ user: PublicUser }` + sets `accessToken` and `refreshToken` cookies |
| 400 | Validation failed (see message for which field) |
| 409 | Email already registered (also returned if two signups for one email race each other) |
| 429 | Too many attempts — try again later |

### `POST /api/auth/login`

| | |
|---|---|
| Auth required | No |
| Rate limited | Yes — 10 requests / 15 min / IP, tracked separately per endpoint |
| Body | `{ email: string, password: string }` |
| 200 | `{ user: PublicUser }` + sets both cookies |
| 401 | `"Invalid email or password"` — deliberately identical for a wrong password and an unregistered email, to avoid confirming which one it was |
| 429 | Too many attempts — try again later |

### `POST /api/auth/refresh`

Rotates the current session: issues a new access+refresh pair, invalidates
the old refresh token. See [10-authentication](../10-authentication/) for
what happens if a refresh token is replayed after already being rotated
out.

| | |
|---|---|
| Auth required | Refresh-token cookie (not the access token) |
| Body | none |
| 200 | `{ user: PublicUser }` + sets new cookies |
| 401 | Missing, unknown, expired, or reused refresh token |

### `POST /api/auth/logout`

| | |
|---|---|
| Auth required | No (safe to call with no session; it's a no-op) |
| Body | none |
| 204 | No content. Clears both cookies; revokes the refresh token server-side if one was present |

## User endpoints

### `GET /api/users/me`

| | |
|---|---|
| Auth required | Yes (`requireAuth`) |
| 200 | `{ user: PublicUser }` |
| 401 | Not authenticated |

## `PublicUser` shape

Returned by every endpoint above — notice what's absent:

```ts
{
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  preferences: { theme: 'light' | 'dark' | 'system'; autoplayNext: boolean; defaultPlaybackRate: number };
  createdAt: string; // ISO 8601
}
```

No `passwordHash`, ever — see [08-backend-architecture](../08-backend-architecture/)
on why that's structurally true rather than just "remembered to strip it".

## Video endpoints

### `POST /api/videos/import`

Parses a YouTube video or playlist URL, fetches its metadata, stores it,
and adds it to the caller's library. See
[11-youtube-integration](../11-youtube-integration/) for the full flow.

| | |
|---|---|
| Auth required | Yes |
| Body | `{ url: string }` |
| 201 (video) | `{ type: 'video', video: Video }` |
| 201 (playlist) | `{ type: 'playlist', playlistTitle: string, videos: Video[] }` |
| 400 | Not a recognizable YouTube URL, or a Shorts link |
| 404 | The video/playlist is unavailable, private, or (playlist) empty |
| 503 | YouTube's API quota is exhausted |
| 502 | YouTube's API couldn't be reached |

### `GET /api/videos/:id`

| | |
|---|---|
| Auth required | Yes |
| 200 | `{ video: Video }` |
| 404 | No video with that id |

### `Video` shape

```ts
{
  id: string;
  youtubeVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  durationSeconds: number;
  embeddable: boolean;
  publishedAt: string; // ISO 8601
}
```

## Library endpoints

### `GET /api/library`

The caller's saved videos, newest first.

| | |
|---|---|
| Auth required | Yes |
| 200 | `{ items: Array<{ savedAt: string; video: Video }> }` |

No filtering/sorting/search yet — Phase 8 adds query parameters here
without changing the response shape.

## Progress endpoints

See [13-learning-features/progress-tracking](../13-learning-features/progress-tracking.md)
for the full save/resume/completion flow.

### `PUT /api/progress/:videoId`

Saves (upserts) playback progress. `completed`, when present, overrides
the automatic 90%-threshold computation — this is the "Mark complete" /
"Mark incomplete" action; omit it for an ordinary autosave.

| | |
|---|---|
| Auth required | Yes |
| Body | `{ positionSeconds: number, durationSeconds: number, completed?: boolean }` |
| 200 | `{ progress: WatchProgress }` |
| 400 | Invalid video id |
| 404 | No video with that id |

### `GET /api/progress/:videoId`

| | |
|---|---|
| Auth required | Yes |
| 200 | `{ progress: WatchProgress \| null }` — `null` means never watched, not an error |

### `GET /api/progress`

The caller's in-progress (started, not completed) videos — "Continue
Learning" — newest-watched first.

| | |
|---|---|
| Auth required | Yes |
| 200 | `{ items: Array<WatchProgress & { video: Video }> }` |

### `WatchProgress` shape

```ts
{
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;    // 0–100
  completed: boolean;
  lastWatchedAt: string;  // ISO 8601
}
```

## Still to come

`/api/playlists`, `/api/notes`, `/api/bookmarks`, `/api/search`,
`/api/stats` are designed (see
[ADR-003](../22-architecture/decisions/ADR-003-database-schema-design.md))
but not yet implemented — documented here once each phase lands.
