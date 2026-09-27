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

## Still to come

`/api/videos`, `/api/library`, `/api/playlists`, `/api/progress`,
`/api/notes`, `/api/bookmarks`, `/api/search`, `/api/stats` are designed
(see the root README's Phase 1 delivery message for the target shape) but
not yet implemented — documented here once each phase lands.
