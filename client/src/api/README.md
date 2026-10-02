# api/

The HTTP boundary between the client and the Express API: one Axios
instance (`client.ts` — base URL, `withCredentials` for the auth cookies,
a refresh-and-retry interceptor) plus one thin wrapper module per backend
resource (`auth.ts`, `videos.ts`, `library.ts`, ...).

Nothing here should know about React — no hooks, no components, and
notably no error handling beyond what Axios itself does: a rejected
promise propagates up to whatever TanStack Query hook called it. The
hooks that *use* these functions live in each feature's own folder under
`features/`.
