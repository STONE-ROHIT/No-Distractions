import { Link } from 'react-router-dom';

// Temporary placeholder, same spirit as Phase 1's — the real landing page
// (with an intentional design system) is built in Phase 3. Now links
// somewhere useful since Phase 2 gives it somewhere to link to.
export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-neutral-100">
      <p className="text-sm font-medium tracking-wide text-neutral-500">No Distractions</p>
      <h1 className="text-3xl font-semibold text-balance">
        Learn from YouTube. Without the distractions.
      </h1>
      <p className="max-w-md text-sm text-neutral-400">
        Phase 2 (Authentication) is live. The full landing page and learning experience are built in
        later phases.
      </p>
      <div className="mt-2 flex gap-4">
        <Link to="/login" className="text-sm text-neutral-100 underline underline-offset-2">
          Log in
        </Link>
        <Link to="/register" className="text-sm text-neutral-100 underline underline-offset-2">
          Sign up
        </Link>
      </div>
    </main>
  );
}
