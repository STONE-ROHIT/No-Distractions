# components/

Shared, reusable, presentation-focused UI building blocks used across more
than one page or feature — buttons, inputs, modals, skeleton loaders, empty
states, etc.

**Belongs here:** components with no knowledge of a specific feature's data
or API calls. A `Button` or `ProgressBar` belongs here; a `NoteEditor` does
not (it belongs in `features/notes/`, because it only makes sense in the
context of that feature).

**Does not belong here:** anything that fetches data, anything tied to one
route, anything with feature-specific business logic.
