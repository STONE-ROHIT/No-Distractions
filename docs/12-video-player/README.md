# 12 · Video Player

## Why a plain iframe wasn't enough anymore

Phase 4's player was `<iframe src="https://www.youtube-nocookie.com/embed/{id}">`
— enough to display and play a video, and nothing more. An iframe is a
sealed box: the page that embeds it cannot read anything happening
inside, or tell it what to do, beyond the handful of things URL
parameters configure once, at load time. Progress tracking needs to ask
"where is playback right now?" every few seconds; keyboard shortcuts need
to tell the player "seek back 5 seconds" on demand. Neither is possible
through a plain iframe.

## The IFrame Player JS API

YouTube's answer is a second, separate script
(`https://www.youtube.com/iframe_api`) that, once loaded, lets your page
construct a `YT.Player` JavaScript object bound to an embedded video.
That object is a remote control: `player.getCurrentTime()`,
`player.seekTo(90, true)`, `player.pauseVideo()`, and so on — all
communicating with the actual iframe under the hood via `postMessage`,
invisibly. This is still the same officially-supported embedding
mechanism as Phase 4 (still `youtube-nocookie.com`, still no stream
access) — just with a JavaScript handle attached to it.

## Wrapping an imperative, global-script API in React

This API predates React and doesn't know it exists: it's callback-driven
(`onReady`, `onStateChange`, `onError` functions you provide), attaches
itself to the page via a global script tag, and signals "I've loaded" by
calling a function you're expected to have put on `window` yourself
(`window.onYouTubeIframeAPIReady`) — the opposite of how a typical npm
package would integrate. `features/videos/hooks/useYoutubePlayer.ts`
exists to bridge that gap once, so the rest of the app can treat a
YouTube player like any other React hook.

Three pieces work together:

1. **`features/videos/lib/youtubeIframeApi.ts`** — loads the script
   exactly once (however many player instances exist over the app's
   lifetime) and resolves a promise with the `YT` namespace. Isolated in
   its own file specifically so tests can mock just this one module and
   inject a fake `YT` — see "Testing" below.
2. **`useYoutubePlayer.ts`** — on mount, loads the API, constructs a
   `YT.Player` against a `<div>` (via `containerRef`, which the real API
   replaces with its own iframe), and translates its callback-style
   events into normal React state (`isReady`, `isPlaying`, `isMuted`,
   `hasError`) and plain functions (`togglePlay`, `seekBy`, `toggleMute`,
   `requestFullscreen`).
3. **`VideoPlayer.tsx`** — the component. Renders the fallback UI
   immediately (no script ever loads) if `embeddable` is false; otherwise
   renders the container `<div>` and wires up keyboard shortcuts once the
   player reports `isReady`.

## `startSeconds` is read once, not tracked live

`useYoutubePlayer`'s `startSeconds` option sets `playerVars.start` at
player *construction* time and is deliberately excluded from the
creation effect's dependency list — if it were tracked live, a saved
progress value arriving a moment after the player already started
(a real possibility: the progress query and the video query resolve
independently) would tear down and rebuild the player, visibly restarting
playback. `pages/VideoPage.tsx` sidesteps this at the source instead: it
doesn't render `VideoPlayer` at all until *both* the video and the
existing progress have loaded, so by the time a player is created,
`startSeconds` is already final.

## Progress reporting: callbacks via refs, not dependencies

`onProgress` and `onEnded` are almost certainly a fresh inline function
on every render of whatever renders `VideoPlayer`. If the creation
effect depended on them directly, the player would be destroyed and
recreated — losing playback position — on every unrelated re-render.
Instead they're stored in refs, updated every render via an effect with
no dependency array (not assigned directly in the render body — see the
code comment on why: writing a ref during render isn't safe with
React's stricter `react-hooks/refs` lint rule, since a render can be
discarded or re-run without committing), and read through the ref inside
the event handlers. The main creation effect depends on nothing but the
video id itself.

## Keyboard shortcuts

`usePlayerKeyboardShortcuts.ts` — Space (play/pause), `←`/`→` (seek ±5s),
`M` (mute), `F` (fullscreen). This is the player-only subset of what the
product eventually supports: `N`/`P` (next/previous video) need a
playlist (Phase 7), and `B` (bookmark) needs bookmarks (Phase 6) — both
land in Phase 10 (Focus Mode) once something exists for them to act on.
Listens on `document` (so shortcuts work anywhere on the page, the way
they do on YouTube itself) but checks `event.target` first and backs off
if focus is in an input, textarea, or any `contenteditable` element —
written this way so a future text field elsewhere on the video page (a
notes textarea, Phase 6) is automatically safe without this code needing
to change.

## Testing

No test touches a real YouTube script or a real browser-level
`postMessage` channel — there's no network path to youtube.com in this
project's test environment regardless. `client/src/test/fakeYoutubePlayer.ts`
is a fake `YT.Player` implementation matching the handful of methods and
events this codebase actually calls, with `simulateReady()` /
`simulateStateChange()` / `simulateError()` helpers a test uses to drive
it exactly like a real player (or a person) would. `useYoutubePlayer.test.ts`
mocks `youtubeIframeApi.ts` to return this fake and tests the hook in
total isolation — including the progress-interval timing, using Vitest's
fake timers rather than real `setTimeout` delays.

## Where things live

| Concern | File |
|---|---|
| Script loading (mockable boundary) | `client/src/features/videos/lib/youtubeIframeApi.ts` |
| Player lifecycle + controls | `client/src/features/videos/hooks/useYoutubePlayer.ts` |
| Keyboard shortcuts | `client/src/features/videos/hooks/usePlayerKeyboardShortcuts.ts` |
| The component | `client/src/features/videos/components/VideoPlayer.tsx` |
| Fake player for tests | `client/src/test/fakeYoutubePlayer.ts` |

Progress tracking itself (what gets saved, when, and how resume/
completion work) is covered in
[13-learning-features/progress-tracking](../13-learning-features/progress-tracking.md).

## Try it yourself

`useYoutubePlayer`'s creation effect depends on `[youtubeVideoId,
options.enabled]` but deliberately not on `startSeconds`, `onProgress`,
or `onEnded`. For each of those three omitted values, explain — in terms
of what would visibly break — why including it would be wrong.
