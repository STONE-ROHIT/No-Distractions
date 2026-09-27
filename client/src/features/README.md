# features/

Each subfolder is a vertical slice of one product capability: its
components, hooks, and TanStack Query calls live together, instead of
being scattered across `components/`, `hooks/`, and `pages/` by technical
type. This is what keeps the app navigable as it grows — to understand
"notes", you open one folder, not four.

Current slices (filled in as their phase is implemented):
- `auth/` — login, registration, session state
- `videos/` — importing a YouTube URL/playlist, video metadata, the player
- `playlists/` — learning playlists (create/reorder/track progress)
- `progress/` — watch progress tracking and resume
- `notes/` — timestamped notes
- `bookmarks/` — timestamped bookmarks
