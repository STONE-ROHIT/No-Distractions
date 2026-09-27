# api/

The HTTP boundary between the client and the Express API: one Axios
instance (base URL, `withCredentials` for the auth cookies, response/error
interceptors, refresh-token retry logic) plus one thin wrapper module per
backend resource (`auth.ts`, `videos.ts`, `playlists.ts`, ...).

Nothing here should know about React — no hooks, no components. TanStack
Query hooks that *use* these functions live inside each feature folder.
