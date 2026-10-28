import { useEffect, useRef } from 'react'

/**
 * Wrapper around the official YouTube IFrame Player API.
 *
 * - Loads https://www.youtube.com/iframe_api once per page.
 * - Renders a 16:9 responsive player.
 * - Emits onProgress(positionSec, durationSec, info) while playing
 *   (roughly every 10 seconds) and on pause/end, so the parent can
 *   persist progress.
 * - Emits a final `unmount` progress event when the component goes away,
 *   and an `interrupted` event when the tab is hidden or unloaded while
 *   playing — so navigating away mid-video loses at most a few seconds.
 * - Resumes from `startAt` seconds when the player becomes ready.
 * - Exposes the raw YT.Player through `playerRef` (used by notes to
 *   seek to a timestamp).
 *
 * We only use documented player parameters; playback itself (including
 * any ads) is entirely YouTube's.
 */

let iframeApiPromise = null

function loadIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT && window.YT.Player) return Promise.resolve()

  if (!iframeApiPromise) {
    iframeApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous()
        resolve()
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.onerror = () => reject(new Error('Could not load the YouTube player.'))
      document.head.appendChild(script)
    })
  }
  return iframeApiPromise
}

/** Human-friendly messages for the player's documented error codes. */
const PLAYER_ERROR_MESSAGES = {
  2: 'The video request looks malformed.',
  5: 'The video could not be played in this browser.',
  100: 'This video does not exist or is private.',
  101: 'The video owner does not allow it to be played here.',
  150: 'The video owner does not allow it to be played here.',
}

export default function YouTubePlayer({
  videoId,
  startAt = 0,
  resume = true,
  playerRef,
  onProgress,
  onEnded,
  onError,
}) {
  const containerRef = useRef(null)
  // Keep callbacks fresh without recreating the player.
  const handlers = useRef({ onProgress, onEnded, onError, resume, startAt })
  handlers.current = { onProgress, onEnded, onError, resume, startAt }

  useEffect(() => {
    const host = containerRef.current
    if (!host) return undefined

    let cancelled = false
    let progressTimer = null
    let player = null

    function emitProgress(target, info) {
      try {
        const positionSec = target.getCurrentTime() || 0
        const durationSec = target.getDuration() || 0
        handlers.current.onProgress?.(positionSec, durationSec, info)
      } catch {
        // Player already destroyed: ignore.
      }
    }

    /** Save once when playback is interrupted by the tab going away. */
    function saveIfPlaying(info) {
      if (!player || cancelled) return
      try {
        if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          emitProgress(player, info)
        }
      } catch {
        // Player not ready or already destroyed: ignore.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveIfPlaying({ interrupted: true })
    }
    const onPageHide = () => saveIfPlaying({ interrupted: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    loadIframeApi()
      .then(() => {
        if (cancelled) return

        // YT replaces this element with an <iframe>; we keep `host`
        // empty and managed by this effect only.
        const mountEl = document.createElement('div')
        mountEl.style.width = '100%'
        mountEl.style.height = '100%'
        host.appendChild(mountEl)

        player = new window.YT.Player(mountEl, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0, // "related" suggestions stay on the same channel
            playsinline: 1, // keep the video inline on phones
            modestbranding: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return
              const duration = event.target.getDuration() || 0
              const { resume: shouldResume, startAt: resumeFrom } = handlers.current
              // Only seek for a meaningful resume point that is not
              // basically the end of the video.
              if (
                shouldResume &&
                resumeFrom > 5 &&
                duration > 0 &&
                resumeFrom < duration - 10
              ) {
                event.target.seekTo(resumeFrom, true)
                handlers.current.onProgress?.(resumeFrom, duration, { resumed: true })
              }
            },
            onStateChange: (event) => {
              if (cancelled) return
              const { PLAYING, PAUSED, ENDED } = window.YT.PlayerState
              if (event.data === PLAYING) {
                if (progressTimer) clearInterval(progressTimer)
                progressTimer = setInterval(() => emitProgress(event.target), 10_000)
              } else if (event.data === PAUSED) {
                if (progressTimer) clearInterval(progressTimer)
                progressTimer = null
                emitProgress(event.target, { paused: true })
              } else if (event.data === ENDED) {
                if (progressTimer) clearInterval(progressTimer)
                progressTimer = null
                emitProgress(event.target, { ended: true })
                handlers.current.onEnded?.()
              }
            },
            onError: (event) => {
              if (cancelled) return
              const message =
                PLAYER_ERROR_MESSAGES[event.data] || 'The video could not be played.'
              handlers.current.onError?.(message)
            },
          },
        })

        if (playerRef) playerRef.current = player
      })
      .catch((err) => {
        if (!cancelled) handlers.current.onError?.(err.message)
      })

    return () => {
      cancelled = true
      if (progressTimer) clearInterval(progressTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      if (player) {
        // Final save before the player is torn down (SPA navigation,
        // video switch, component unmount).
        try {
          emitProgress(player, { unmount: true })
        } catch {
          // Ignore teardown races.
        }
        try {
          player.destroy()
        } catch {
          // Ignore teardown races.
        }
      }
      // The iframe may be gone, but any leftovers we added go too.
      host.innerHTML = ''
      if (playerRef) playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return (
    <div
      ref={containerRef}
      className="aspect-video w-full overflow-hidden rounded-xl bg-stone-900"
      aria-label="YouTube video player"
    />
  )
}
