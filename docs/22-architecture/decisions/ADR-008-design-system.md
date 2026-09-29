# ADR-008: Design system

## Context

Phase 3 is the first phase where visual design is itself the deliverable
(the app shell, the landing page), rather than an afterthought bolted
onto working functionality. The brief is explicit that the product
should look intentional and "not like a generic AI-generated dashboard" —
a real constraint to design against, not just a nice-to-have.

## Decision

- **Hand-written design tokens** (`client/src/index.css`) — two "ink"
  colors that swap between light/dark, one highlighter-yellow accent, all
  as CSS custom properties mapped into Tailwind's theme via `@theme
  inline`. Every foreground/background pairing used for text was checked
  against WCAG AA contrast in both themes before being used (see the
  numbers in this ADR's history — computed with a small script, not
  eyeballed).
- **Two variable fonts**: Literata (serif, for headings — an editorial,
  "study" feel, deliberately not another grotesk-sans SaaS headline) and
  Instrument Sans (for everything else). Both via `@fontsource-variable`,
  self-hosted (no Google Fonts CDN request), weight-axis-only files
  (~80KB combined for the latin subset actually used, verified against
  the fetched files, not assumed).
- **lucide-react** for small functional UI icons (menu, theme toggle,
  logout, chevrons) — a maintained, tree-shakeable, consistent icon set.
- **Hand-drawn SVG marks** (not from an icon library) specifically for
  the landing page's four feature illustrations — each literally depicts
  its feature (a timestamp arrow, a progress arc, a checked list, a
  viewfinder) rather than a generic decorative icon grid, which is
  precisely the pattern that reads as templated/AI-generated.
- **One motion moment**: the landing page's "struck-through" distractions
  list, sequenced via a `--strike-order` CSS custom property per item and
  `prefers-reduced-motion` respected (the strike is simply already
  applied, unanimated, if the visitor has that preference set). Chosen
  over motion elsewhere in the product, on purpose — the brief calls for
  "minimal animations," and one meaningful moment that reinforces the
  product's actual value proposition beats decorative motion sprinkled
  throughout.

## Alternatives considered

- **A component library** (shadcn/ui, MUI, Chakra) — would have been
  faster to ship Phase 3 with. Rejected because every one of them has a
  recognizable default look, and adopting one wholesale runs directly
  against "shouldn't look like a generic AI-generated dashboard." Plain
  Tailwind utilities plus a handful of hand-built primitives
  (`Button`, `TextField`, `EmptyState`, `Avatar`) is more work now, in
  exchange for a look that's actually this product's own.
- **Google Fonts CDN** instead of self-hosted `@fontsource` packages —
  one less build step, but an extra DNS lookup/connection at page load,
  and (for a published/deployed version) a third-party request on every
  page view. Self-hosting costs a slightly bigger `npm install`, nothing
  at runtime.
- **A generic icon-grid features section** (one icon library glyph per
  feature) — the default, fastest option, and the one most likely to
  read as templated. The hand-drawn marks cost more time for four icons;
  worth it for a section that's on the very first screen a visitor sees.

## Trade-offs

Hand-written tokens and hand-built primitives mean more CSS to maintain
than a component library would need, and no built-in components (a
modal, a combobox, a date picker) for later phases to reach for — those
get built as needed, following the same token system.

## Consequences

Any new UI should use the semantic token classes (`bg-canvas`,
`text-ink`, `border-rule`, ...) and never a raw Tailwind color
(`bg-neutral-900`, `text-gray-400`) — a raw color doesn't adapt to the
theme and breaks the one-token-system-everywhere property this ADR
establishes. `docs/06-frontend-architecture` and every `components/`/
`layouts/` file follow this already; it's the standard for everything
built from here on.
