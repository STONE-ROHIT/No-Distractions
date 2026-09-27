# pages/

Route-level components — one per page the router renders (Landing,
Dashboard, VideoPage, LibraryPage, StatsPage, ...).

A page's job is to compose a layout + feature components + data hooks; it
should stay thin. If a page file starts accumulating real logic, that logic
almost certainly belongs in a hook or a `features/*` module instead.
