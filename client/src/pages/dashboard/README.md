# pages/dashboard/

The four dashboard sections (Continue Learning, My Library, Recently
Added, Progress), each currently just an `EmptyState` — there's no
progress/library/stats data model yet. Kept as their own small files
rather than inlined in `DashboardPage.tsx` so each can be swapped for its
real implementation independently as Phases 4/5/8/9 land, without
touching the others. Once a section has real data and its own API calls,
it graduates to living inside the matching `features/` folder instead
(e.g. `ContinueLearningSection` moves under `features/progress/` in
Phase 5) — this folder is temporary scaffolding, not a permanent home.
