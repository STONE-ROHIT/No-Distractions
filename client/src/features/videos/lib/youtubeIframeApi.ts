/**
 * Loads YouTube's IFrame Player JS API script exactly once, however many
 * players end up on the page over the app's lifetime, and resolves with
 * the global `YT` namespace it installs.
 *
 * Isolated in its own module — not inlined into useYoutubePlayer.ts —
 * specifically so tests can mock this one file and inject a fake `YT`
 * namespace, the same pattern server/src/services/youtubeApi.ts uses for
 * the Data API: everything above this boundary is real code under real
 * test, only the external script load itself is faked.
 */
let apiPromise: Promise<typeof YT> | null = null;

export function loadYoutubeIframeApi(): Promise<typeof YT> {
  if (typeof window.YT?.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve) => {
    // YouTube's script calls this global once it's loaded and ready —
    // chained rather than overwritten, in case something else on the
    // page also sets it.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return apiPromise;
}
