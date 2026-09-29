import { Link } from 'react-router-dom';
import { buttonClassName } from '../../components/button-styles';
import { EmptyState } from '../../components/EmptyState';
import { DashboardSection } from './DashboardSection';

// Will show recently watched videos, % complete, and a resume button once
// Phase 5 (Learning Player) and Phase 4 (YouTube Integration) exist —
// this section has nothing to read yet.
export function ContinueLearningSection() {
  return (
    <DashboardSection title="Continue learning">
      <EmptyState
        title="Nothing in progress"
        description="Import a video to pick up right where a real Continue Learning section would resume you."
        action={
          <Link to="/library" className={buttonClassName('secondary')}>
            Go to library
          </Link>
        }
      />
    </DashboardSection>
  );
}
