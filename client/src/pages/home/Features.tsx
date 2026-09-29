interface Feature {
  title: string;
  description: string;
  mark: React.ReactNode;
}

// Small geometric marks drawn to match the brand's play-triangle, rather
// than a generic icon-library grid — each literally depicts its feature
// (a timestamp tick, a progress arc, a checked list, a viewfinder) instead
// of a decorative stand-in.
const FEATURES: Feature[] = [
  {
    title: 'Notes, pinned to a timestamp',
    description: 'Write a note at 13:42; click it later and the player jumps straight there.',
    mark: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path
          d="M4 12h11m0 0-4-4m4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Resume exactly where you stopped',
    description: 'Come back tomorrow and the video picks up at your last position, not the start.',
    mark: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeOpacity="0.3"
        />
        <path
          d="M12 3.5a8.5 8.5 0 0 1 6 14.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Playlists organized as courses',
    description: 'Group videos into a course, watch them in order, see how much is left.',
    mark: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path
          d="M4 6h16M4 12h16M4 18h9"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="m17 16.5 2 2 3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: 'A focus mode worth using',
    description: 'One key hides everything but the video and your notes. Another brings it back.',
    mark: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path
          d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="border-t border-rule px-6 py-16 sm:px-10">
      <h2 className="font-serif text-2xl text-ink">Built for studying, not scrolling</h2>
      <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex gap-4">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-wash text-ink">
              {feature.mark}
            </span>
            <div>
              <p className="font-medium text-ink">{feature.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
