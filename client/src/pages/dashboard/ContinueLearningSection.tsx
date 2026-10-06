import { Link } from 'react-router-dom';
import { buttonClassName } from '../../components/button-styles';
import { EmptyState } from '../../components/EmptyState';
import { useContinueLearning } from '../../features/progress/hooks/useContinueLearning';
import { DashboardSection } from './DashboardSection';

export function ContinueLearningSection() {
  const { data: items, isLoading } = useContinueLearning();

  return (
    <DashboardSection title="Continue learning">
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading continue learning"
          className="h-24 animate-pulse rounded-lg bg-wash"
        />
      ) : items && items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.slice(0, 3).map((entry) => (
            <li key={entry.video.id}>
              <Link
                to={`/videos/${entry.video.id}`}
                className="flex items-center gap-3 hover:underline"
              >
                <img
                  src={entry.video.thumbnailUrl}
                  alt=""
                  className="h-10 w-16 shrink-0 rounded object-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm text-ink">{entry.video.title}</span>
                  <span className="h-1 overflow-hidden rounded-full bg-wash">
                    <span
                      className="block h-full rounded-full bg-marker"
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{entry.percentage}%</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nothing in progress"
          description="Import a video and start watching — it'll show up here so you can pick back up."
          action={
            <Link to="/library" className={buttonClassName('secondary')}>
              Go to library
            </Link>
          }
        />
      )}
    </DashboardSection>
  );
}
