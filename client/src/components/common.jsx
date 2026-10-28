/** Small shared building blocks used across pages. */

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Spinner({ className = '' }) {
  return (
    <svg
      className={`h-6 w-6 animate-spin text-stone-400 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/** Card skeleton used while data loads. */
export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video rounded-lg bg-stone-200" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-4/5 rounded bg-stone-200" />
        <div className="h-3 w-2/5 rounded bg-stone-200" />
      </div>
    </div>
  )
}

/** Friendly empty state with an icon, title, hint, and optional action. */
export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
          <Icon className="h-6 w-6 text-stone-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-stone-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Inline error block with retry option. */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm font-medium text-red-800">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/**
 * Minimal accessible modal: overlay + card, closes on backdrop click
 * and Escape. Used for "Add to playlist" and "New playlist" dialogs.
 */
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl ${
          wide ? 'sm:max-w-lg' : 'sm:max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Green "Completed" / gray "Not started" / amber "In progress" badge. */
export function StatusBadge({ item }) {
  if (item.completed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Completed
      </span>
    )
  }
  if (item.lastPositionSec > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        In progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
      Not started
    </span>
  )
}
