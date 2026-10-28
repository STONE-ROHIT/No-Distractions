import { Link } from 'react-router-dom'
import { ListVideo, NotebookPen, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { BrandMark } from '../components/AppLayout.jsx'

/**
 * Public landing page: what the app is, and how to get started.
 */
export default function Landing() {
  const { user } = useAuth()
  const primaryHref = user ? '/app' : '/signup'

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight text-stone-900">
            No Distractions
          </span>
        </div>
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <Link
              to="/app"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Go to your dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            A quieter way to study
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Learn from YouTube.
            <br />
            Without the distractions.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-600">
            Save the videos you actually want to learn from, organize them into
            playlists, pick up exactly where you left off, and keep your notes
            in one calm, focused place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={primaryHref}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              Start learning
            </Link>
            {!user && (
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-7 text-base font-medium text-stone-700 hover:bg-stone-100"
              >
                I already have an account
              </Link>
            )}
          </div>
        </section>

        {/* A small, honest visual: the focused watch page in miniature */}
        <section className="mx-auto w-full max-w-2xl px-4 pb-4 sm:px-6" aria-hidden="true">
          <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex gap-4">
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-stone-900 sm:w-36">
                <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-8 w-8 fill-white/90">
                  <path d="M9.5 7.5v9c0 .8.9 1.3 1.6.9l7.2-4.5c.6-.4.6-1.3 0-1.7l-7.2-4.5c-.7-.4-1.6.1-1.6.8z" />
                </svg>
              </div>
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-3.5 w-4/5 rounded bg-stone-200" />
                <div className="h-3 w-2/5 rounded bg-stone-100" />
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded bg-stone-100">
                      <div className="h-full w-1/3 rounded bg-emerald-500" />
                    </div>
                    <div className="h-2.5 w-10 rounded bg-stone-100" />
                  </div>
                  <div className="h-2 w-3/5 rounded bg-stone-100" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <Feature
              icon={TrendingUp}
              title="Pick up where you left off"
              text="Your position is remembered for every video, so a study session starts in one click — not in a search bar."
            />
            <Feature
              icon={ListVideo}
              title="Playlists with real progress"
              text="Group videos into a learning playlist and see how much of it you have actually finished."
            />
            <Feature
              icon={NotebookPen}
              title="Notes that remember the moment"
              text="Write notes while you watch. Attach a timestamp and jump straight back to that part later."
            />
          </div>
        </section>

        {/* Honest note about what this is */}
        <section className="mx-auto w-full max-w-2xl px-4 pb-20 text-center sm:px-6">
          <p className="text-xs leading-relaxed text-stone-400">
            No Distractions is a calm study space around the official YouTube
            player. Videos play through YouTube as usual — this app simply
            removes everything else, and adds the learning tools YouTube
            doesn't give you.
          </p>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 text-xs text-stone-400 sm:px-6">
          <span>No Distractions</span>
          <span>Built for focused learning.</span>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="text-center sm:text-left">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 sm:mx-0">
        <Icon className="h-5 w-5 text-emerald-700" />
      </div>
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{text}</p>
    </div>
  )
}
