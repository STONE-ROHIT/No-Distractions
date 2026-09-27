# services/

Cross-cutting frontend services that are not "just an API call" — e.g. the
future offline layer (`OfflineMediaProvider`, IndexedDB access, service
worker registration/sync). Business logic that talks to the browser
platform rather than to a specific backend endpoint belongs here.
