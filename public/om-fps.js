// `?fps=1` debug overlay (same idea as Migrova's public/passport-fps.js). app/components/FpsLoader
// injects this file only when the param is present, so it costs nothing otherwise. Shows frame
// stats over the last ~2 s (fps, p50 / p95 frame interval, share of frames over 16.7 ms), how
// many split-flap tiles are flipping (now, peak over the window, queued) and the viewport.
// Repaints its text twice a second.
(function () {
  if (document.querySelector('[data-om-fps]')) return;

  var box = document.createElement('pre');
  box.setAttribute('data-om-fps', '');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText =
    'position:fixed;left:8px;bottom:max(8px, env(safe-area-inset-bottom));z-index:100;margin:0;' +
    'padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.8);color:#ffc531;' +
    'font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre;pointer-events:none';
  document.body.appendChild(box);

  var WINDOW_MS = 2000;
  var samples = []; // [time, interval, tiles flipping]
  var last = 0;
  function flap() {
    var get = window.__omFlapStats;
    return typeof get === 'function' ? get() : null;
  }
  function loop(t) {
    if (last) {
      var f = flap();
      samples.push([t, t - last, f ? f.active : 0]);
    }
    last = t;
    window.requestAnimationFrame(loop);
  }
  window.requestAnimationFrame(loop);

  // Nearest-rank percentile of an ascending array.
  function rank(sorted, q) {
    return sorted.length ? sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] : 0;
  }

  function paint() {
    var now = performance.now();
    while (samples.length && now - samples[0][0] > WINDOW_MS) samples.shift();
    var xs = samples.map(function (s) { return s[1]; }).sort(function (a, b) { return a - b; });
    var sum = 0;
    var slow = 0;
    var peak = 0;
    for (var i = 0; i < samples.length; i++) {
      sum += samples[i][1];
      if (samples[i][1] > 16.7) slow++;
      if (samples[i][2] > peak) peak = samples[i][2];
    }
    var fps = xs.length ? 1000 / (sum / xs.length) : 0;
    var f = flap();
    box.textContent = [
      fps.toFixed(0) + ' fps  p50 ' + rank(xs, 0.5).toFixed(1) + '  p95 ' + rank(xs, 0.95).toFixed(1) + ' ms',
      '>16.7ms ' + (xs.length ? ((100 * slow) / xs.length).toFixed(0) : 0) + '%  · ' + xs.length + ' frames / 2s',
      f ? 'tiles ' + f.active + ' flipping · peak ' + peak + ' · ' + f.queued + ' queued' : 'tiles -',
      window.innerWidth + '×' + window.innerHeight + ' @' + window.devicePixelRatio + 'x',
    ].join('\n');
  }
  paint();
  window.setInterval(paint, 500);
})();
