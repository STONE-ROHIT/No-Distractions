import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * The standard "nothing here yet" state — used instead of an empty
 * container anywhere a list of videos/playlists/notes could plausibly be
 * empty. See docs/13-learning-features (once written) for the product
 * reasoning; the shape here (title + one sentence + optional single
 * action) is intentionally the same everywhere it appears.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-rule-strong p-6">
      <p className="font-serif text-lg text-ink">{title}</p>
      <p className="text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
