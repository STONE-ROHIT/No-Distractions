# components/

Shared, reusable, presentation-focused UI building blocks used across more
than one page or feature — buttons, inputs, modals, skeleton loaders, empty
states, etc.

`Button.tsx` / `TextField.tsx` — intentionally plain (no design-token
system yet; that's decided in Phase 3's application shell) but accessible:
labeled inputs, `aria-invalid`/`aria-describedby` wired to an error
message, visible focus states.

**Belongs here:** components with no knowledge of a specific feature's data
or API calls. A `Button` or `ProgressBar` belongs here; a `NoteEditor` does
not (it belongs in `features/notes/`, because it only makes sense in the
context of that feature).

**Does not belong here:** anything that fetches data, anything tied to one
route, anything with feature-specific business logic.
