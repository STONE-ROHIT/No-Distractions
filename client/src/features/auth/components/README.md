# features/auth/

Everything specific to the auth feature that `context/AuthContext.tsx`
doesn't own: the login/register forms and their own `useMutation` calls
(each updates the shared `authMeQueryKey` cache entry on success — see
AuthContext's comment on why login/register aren't part of the context
itself).
