// Module augmentation: the IFrame Player API script (loaded dynamically —
// see features/videos/lib/youtubeIframeApi.ts) attaches itself to the
// global window as `YT`, and calls `window.onYouTubeIframeAPIReady` once
// it's loaded. Neither is part of the standard DOM lib or covered by the
// @types/youtube package's own ambient types (which only cover the `YT`
// namespace's contents, not where the browser attaches it).
export {};

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // @types/youtube declares the `YT` namespace's types (YT.Player,
    // YT.PlayerState, ...) but not that `window.YT` holds a value of that
    // shape at runtime once the script has loaded — that part is this.
    YT?: typeof YT;
  }
}
