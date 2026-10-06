import { useEffect, useRef } from 'react';
import { SEEK_STEP_SECONDS } from './useYoutubePlayer';

interface PlayerActions {
  togglePlay: () => void;
  seekBy: (deltaSeconds: number) => void;
  toggleMute: () => void;
  requestFullscreen: () => void;
}

/**
 * The player-only subset of the product's eventual keyboard shortcuts:
 * Space, arrows, M, F. N (next), P (previous), and B (bookmark) are left
 * out — they need a playlist (Phase 7) and bookmarks (Phase 6) to mean
 * anything, and are added in Phase 10 (Focus Mode) once those exist.
 *
 * Listens on `document`, not the player container, so shortcuts work
 * anywhere on the video page the way they do on YouTube itself — guarded
 * against stealing keystrokes from a text input anywhere on the page
 * (including a future notes textarea in Phase 6, which this didn't need
 * to be updated for).
 */
export function usePlayerKeyboardShortcuts(actions: PlayerActions, enabled: boolean): void {
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault(); // the browser's default is to scroll the page
          actionsRef.current.togglePlay();
          break;
        case 'ArrowLeft':
          actionsRef.current.seekBy(-SEEK_STEP_SECONDS);
          break;
        case 'ArrowRight':
          actionsRef.current.seekBy(SEEK_STEP_SECONDS);
          break;
        case 'm':
        case 'M':
          actionsRef.current.toggleMute();
          break;
        case 'f':
        case 'F':
          actionsRef.current.requestFullscreen();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
