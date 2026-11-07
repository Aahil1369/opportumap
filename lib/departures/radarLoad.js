// When the radar (app/components/Map.js, Mapbox GL on /map) counts as up or down, and its one-off
// animation frames. Pure, and tested (scripts/departures/__tests__/15b-m.test.mjs).
//
// - Before Mapbox's 'load': a style or token error (an error event with no sourceId) or no 'load'
//   within timeoutMs says onState('error'), once. A tile failing (an error with a sourceId) never does.
// - 'load' runs its setup (the night style, the beacon layers) and then says onState('ready'), once,
//   even after an error: a slow connection's late load clears the error state.
// - After 'load', errors are ignored: a tile or a later request failing is not the map failing.
// - nextFrame(fn) runs fn on the next animation frame (the beacons lighting up); stop() (the map
//   unmounting) clears the timer and cancels the frames still waiting, so nothing runs on a removed
//   map, and no state is said after it.
//
//   radarLoad({ timeoutMs, onState, clock }) -> { error(e), load(setup), nextFrame(fn), stop(), loaded }
//   clock: { setTimeout, clearTimeout, requestAnimationFrame, cancelAnimationFrame } (tests pass a
//   fake one; the page uses the browser's). Its requestAnimationFrame calls back later, never at once.

const BROWSER_CLOCK = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id),
  requestAnimationFrame: (fn) => globalThis.requestAnimationFrame(fn),
  cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
};

export function radarLoad({ timeoutMs, onState, clock = BROWSER_CLOCK }) {
  let loaded = false;
  let failed = false;
  let stopped = false;
  const frames = new Set();
  const fail = () => {
    if (failed || loaded || stopped) return;
    failed = true;
    onState?.('error');
  };
  const timer = clock.setTimeout(fail, timeoutMs);

  return {
    get loaded() {
      return loaded;
    },
    /** Mapbox's 'error' event: the error state only before 'load', and only when no source (a tile) caused it. */
    error(e) {
      if (!loaded && !e?.sourceId) fail();
    },
    /** Mapbox's 'load' event: setup(), then 'ready'. Once, and even after an error. */
    load(setup) {
      if (loaded || stopped) return;
      loaded = true;
      clock.clearTimeout(timer);
      setup?.();
      onState?.('ready');
    },
    /** fn on the next animation frame, unless the radar stops first. */
    nextFrame(fn) {
      if (stopped) return;
      const id = clock.requestAnimationFrame(() => {
        frames.delete(id);
        fn();
      });
      frames.add(id);
    },
    /** The map is going: no timer, no frame still waiting, no state after this. */
    stop() {
      stopped = true;
      clock.clearTimeout(timer);
      for (const id of frames) clock.cancelAnimationFrame(id);
      frames.clear();
    },
  };
}
