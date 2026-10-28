import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { flushProgressQueue } from '../lib/api.js'
import { countQueuedProgress } from '../lib/offline.js'

/**
 * A thin status bar for offline life, shown at the top of the app:
 *  - "Offline" when the browser reports no connection, with a note that
 *    saved data is being shown once a request actually fell back to cache.
 *  - A pending-sync count when progress updates are queued, with a manual
 *    "Sync now" action (otherwise syncing happens automatically on
 *    reconnect and every 30 seconds).
 *
 * Deliberately quiet: nothing renders when everything is fine.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [usingSavedData, setUsingSavedData] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine) setUsingSavedData(false)
    }
    const onOfflineData = () => setUsingSavedData(true)
    const onQueueChanged = () => {
      countQueuedProgress().then(setPending)
    }

    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    window.addEventListener('nd:offline-data', onOfflineData)
    window.addEventListener('nd:queue-changed', onQueueChanged)
    onQueueChanged()

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      window.removeEventListener('nd:offline-data', onOfflineData)
      window.removeEventListener('nd:queue-changed', onQueueChanged)
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 sm:text-sm"
    >
      {!online && (
        <span className="inline-flex items-center gap-1.5">
          <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
          You’re offline
          {usingSavedData ? ' — showing your last saved data' : ''}
          {pending > 0 ? ` · ${pending} ${pending === 1 ? 'update' : 'updates'} waiting to sync` : ''}
        </span>
      )}
      {online && pending > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {pending} offline {pending === 1 ? 'update' : 'updates'} still syncing
          <button
            onClick={() => flushProgressQueue()}
            className="ml-1 font-medium underline hover:no-underline"
          >
            Sync now
          </button>
        </span>
      )}
    </div>
  )
}
