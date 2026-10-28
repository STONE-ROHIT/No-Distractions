import { Link } from 'react-router-dom'
import { BrandMark } from '../components/AppLayout.jsx'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
      <BrandMark size="lg" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900">
        This page wandered off
      </h1>
      <p className="mt-2 max-w-sm text-sm text-stone-500">
        The link you followed does not exist. Let's get you back to your study space.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Back to the start
      </Link>
    </div>
  )
}
