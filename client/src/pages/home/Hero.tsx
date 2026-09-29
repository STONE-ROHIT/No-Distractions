import { Link } from 'react-router-dom';
import { buttonClassName } from '../../components/button-styles';
import { useAuth } from '../../context/useAuth';

const REMOVED = ['Recommendations', 'Shorts', 'Comments', 'The autoplay queue'];

export function Hero() {
  const { user } = useAuth();

  return (
    <section className="grid gap-10 px-6 pt-10 pb-16 sm:px-10 md:grid-cols-2 md:items-center md:gap-16 md:pt-16">
      <div className="flex flex-col gap-6">
        <h1 className="text-balance font-serif text-4xl leading-[1.1] text-ink sm:text-5xl">
          Learn from YouTube.
          <br />
          Without the distractions.
        </h1>
        <p className="max-w-md text-base text-ink-muted">
          A quiet room around YouTube&apos;s own player: notes pinned to a timestamp, bookmarks, and
          progress that picks up exactly where you stopped. Nothing else.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to={user ? '/dashboard' : '/register'} className={buttonClassName('primary')}>
            {user ? 'Go to dashboard' : 'Start learning'}
          </Link>
          {!user && (
            <Link to="/login" className="text-sm font-medium text-ink-muted hover:text-ink">
              Already have an account? Log in
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-rule bg-surface p-6 sm:p-8">
        <p className="text-sm text-ink-muted">
          Everything YouTube adds that has nothing to do with learning:
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {REMOVED.map((item, index) => (
            <li
              key={item}
              className="struck font-serif text-xl"
              style={{ '--strike-order': index } as never}
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-rule pt-5 font-serif text-xl text-ink">
          What&apos;s left: the video, and you.
        </p>
      </div>
    </section>
  );
}
