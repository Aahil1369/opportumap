// Split-flap resize check: a board that changes size while it flips must still end on its text.
//
//   npm run build && npx next start -p 3300
//   CHROME_PATH=<chrome or chromium binary> node scripts/departures/flap-resize-check.mjs http://localhost:3300/lab/flap
//
// Raw DevTools protocol, no dependencies (HEADED=1 runs a headed window off screen instead of
// headless). Drives the /lab/flap board (its PAUSE and RE-FLAP NOW buttons) on an emulated
// iPhone 13 and, at several moments into a re-flap's cascade, changes the board's size:
//   - turns the phone (390x664 portrait <-> 844x390 landscape, across kit.css's 639px phone
//     breakpoint, so the rows re-lay out and every tile moves);
//   - grows or shrinks the board's height alone (as a new result set would);
//   - grows its height in the same task as the next re-flap starts.
// Right after each resize nothing may be left flipping or queued on the old geometry and the
// canvas must be clear; once settled, every cell's tile characters must equal
// fitFlap(upper(text)) of the cell's real text. Exits 1 on any failure.

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const PORTRAIT = { width: 390, height: 664 };
const LANDSCAPE = { width: 844, height: 390 };
const OFFSETS_MS = [120, 400, 800, 1300, 1900]; // into a cascade (the lab's lasts ~2.6 s)
const SETTLE_MS = 3500;

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/departures/flap-resize-check.mjs <url of /lab/flap>');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In the page: every cell's tiles vs its fitted capitals, the canvas, the engine's queue.
const STATE = `(() => {
  const fit = (t, w) => {
    const c = [...t.toUpperCase()];
    return c.length > w ? c.slice(0, w - 1).join('') + '…' : c.join('') + ' '.repeat(w - c.length);
  };
  const bad = [];
  let cells = 0;
  document.querySelectorAll('.fb-body [role=row]').forEach((row, r) => {
    row.querySelectorAll('[role=cell]').forEach((cell, c) => {
      cells++;
      const text = cell.querySelector('.flap-sr').textContent;
      const tiles = [...cell.querySelectorAll('.flap-t')];
      const faces = tiles.map((t) => (t.firstChild ? t.firstChild.nodeValue : '')).join('');
      if (faces !== fit(text, tiles.length)) bad.push({ row: r, col: c, text, tiles: faces });
    });
  });
  const cv = document.querySelector('.flap-canvas');
  let alpha = 0;
  if (cv && cv.width && cv.height) {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 3; i < d.length; i += 4) alpha += d[i];
  }
  const host = document.querySelector('.fb-table').getBoundingClientRect();
  const { active, queued } = window.__omFlapStats();
  return {
    cells, bad, alpha, active, queued,
    phone: matchMedia('(max-width: 639px)').matches,
    host: Math.round(host.width) + 'x' + Math.round(host.height),
    canvas: cv ? cv.width + 'x' + cv.height : null,
  };
})()`;
const button = (re) => `[...document.querySelectorAll('button')].find((b) => ${re}.test(b.textContent))`;
const REFLAP = `${button('/RE-FLAP NOW/')}.click()`;

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'omflap-'));
  const args = [
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${dir}`, '--remote-debugging-port=0',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    ...(process.env.HEADED ? ['--window-position=-3000,0', '--window-size=900,900'] : ['--headless=new']),
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { windowsHide: !process.env.HEADED, stdio: 'ignore' });
  const killer = setTimeout(() => proc.kill(), 300_000); // never leave Chrome running
  let ws;
  try {
    let port = null;
    for (let i = 0; i < 150 && !port; i++) {
      try {
        port = readFileSync(join(dir, 'DevToolsActivePort'), 'utf8').split('\n');
      } catch {
        await sleep(100);
      }
    }
    if (!port) throw new Error('Chrome did not start');
    ws = new WebSocket(`ws://127.0.0.1:${port[0].trim()}${port[1].trim()}`);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    let nextId = 1;
    const pending = new Map();
    const events = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      } else events.push(msg);
    };
    const send = (method, params = {}, sessionId) =>
      new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
        ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
      });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    const evaluate = async (expression) => {
      const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const viewport = (v) =>
      s('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 3, mobile: true });

    await s('Page.enable');
    await s('Runtime.enable');
    await viewport(PORTRAIT);
    await s('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA, platform: 'iPhone' });
    await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await s('Page.navigate', { url });
    for (let i = 0; i < 600 && !events.some((m) => m.method === 'Page.loadEventFired'); i++) await sleep(100);
    await sleep(SETTLE_MS); // hydration + the first cascade
    await evaluate(`${button('/PAUSE BOARD/')}.click()`); // only RE-FLAP NOW changes the board now
    await sleep(300);

    const failures = [];
    const expectSettled = (label, st) => {
      if (st.bad.length) failures.push(`${label}: ${st.bad.length}/${st.cells} cells show the wrong tiles, e.g. ${JSON.stringify(st.bad.slice(0, 3))}`);
      if (st.alpha) failures.push(`${label}: canvas not clear after settling (alpha sum ${st.alpha})`);
      if (st.active || st.queued) failures.push(`${label}: still ${st.active} flipping, ${st.queued} queued after settling`);
    };
    const expectMidCascade = (label, st) => {
      if (!st.active && !st.queued) failures.push(`${label}: nothing was flipping at the resize (check did not test anything)`);
    };
    const expectDropped = (label, st) => {
      if (st.active || st.queued) failures.push(`${label}: ${st.active} flipping, ${st.queued} queued on the old geometry after the resize`);
      if (st.alpha) failures.push(`${label}: canvas not clear right after the resize (alpha sum ${st.alpha})`);
    };

    const start = await evaluate(STATE);
    console.log(`start (portrait): ${start.cells} cells, host ${start.host}, canvas ${start.canvas}, wrong ${start.bad.length}`);
    expectSettled('start', start);

    // 1. Turn the phone mid-cascade, across the 639px breakpoint, both ways.
    let v = PORTRAIT;
    for (const ms of OFFSETS_MS) {
      const next = v === PORTRAIT ? LANDSCAPE : PORTRAIT;
      const label = `turn ${v.width}->${next.width} at ${ms}ms`;
      await evaluate(REFLAP);
      await sleep(ms);
      const before = await evaluate(STATE);
      await viewport(next);
      v = next;
      await sleep(250);
      const after = await evaluate(STATE);
      await sleep(SETTLE_MS);
      const settled = await evaluate(STATE);
      console.log(
        `${label}: before ${before.active} flipping/${before.queued} queued (phone ${before.phone}, host ${before.host})` +
          ` -> after ${after.active}/${after.queued}, alpha ${after.alpha} (phone ${after.phone}, host ${after.host})` +
          ` -> settled wrong ${settled.bad.length}/${settled.cells}, alpha ${settled.alpha}`,
      );
      expectMidCascade(label, before);
      expectDropped(label, after);
      expectSettled(label, settled);
    }
    if (v !== PORTRAIT) {
      await viewport(PORTRAIT);
      await sleep(500);
    }

    // 2. The board's height alone changes mid-cascade (a new result set), grow then shrink.
    for (const [ms, pad] of [[500, '64px'], [900, '']]) {
      const label = `height ${pad || 'restored'} at ${ms}ms`;
      await evaluate(REFLAP);
      await sleep(ms);
      const before = await evaluate(STATE);
      await evaluate(`document.querySelector('.fb-body').style.paddingBottom = '${pad}'`);
      await sleep(250);
      const after = await evaluate(STATE);
      await sleep(SETTLE_MS);
      const settled = await evaluate(STATE);
      console.log(
        `${label}: before ${before.active}/${before.queued} (host ${before.host}) -> after ${after.active}/${after.queued},` +
          ` alpha ${after.alpha} (host ${after.host}) -> settled wrong ${settled.bad.length}/${settled.cells}, alpha ${settled.alpha}`,
      );
      expectMidCascade(label, before);
      expectDropped(label, after);
      expectSettled(label, settled);
    }

    // 3. Height grows in the same task as the next re-flap starts (the refit on a new flip).
    {
      const label = 'height + re-flap in one task at 600ms';
      await evaluate(REFLAP);
      await sleep(600);
      const before = await evaluate(STATE);
      await evaluate(`document.querySelector('.fb-body').style.paddingBottom = '40px'; ${REFLAP}`);
      await sleep(SETTLE_MS);
      const settled = await evaluate(STATE);
      console.log(
        `${label}: before ${before.active}/${before.queued} -> settled wrong ${settled.bad.length}/${settled.cells},` +
          ` alpha ${settled.alpha}, host ${settled.host}, canvas ${settled.canvas}`,
      );
      expectMidCascade(label, before);
      expectSettled(label, settled);
      await evaluate(`document.querySelector('.fb-body').style.paddingBottom = ''`);
    }

    // 4. A re-flap at rest after all that: lands right, on a canvas fitted to the board again.
    {
      await sleep(300);
      await evaluate(REFLAP);
      await sleep(SETTLE_MS);
      const settled = await evaluate(STATE);
      const fitted = await evaluate(`(() => {
        const r = document.querySelector('.fb-table').getBoundingClientRect();
        const cv = document.querySelector('.flap-canvas');
        const dpr = Math.min(3, devicePixelRatio || 1);
        return cv.width === Math.round(r.width * dpr) && cv.height === Math.round(r.height * dpr);
      })()`);
      console.log(`final re-flap: wrong ${settled.bad.length}/${settled.cells}, alpha ${settled.alpha}, canvas ${settled.canvas} fitted ${fitted}`);
      expectSettled('final re-flap', settled);
      if (!fitted) failures.push('final re-flap: canvas bitmap does not match the board');
    }

    const errors = events
      .filter((m) => m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error'))
      .map((m) => m.params.exceptionDetails?.exception?.description || m.params.args?.map((a) => a.value ?? a.description).join(' '));
    if (errors.length) failures.push(`console errors: ${JSON.stringify(errors.slice(0, 5))}`);

    if (failures.length) {
      console.log(`\nFAIL (${failures.length})`);
      for (const f of failures) console.log(`  - ${f}`);
      process.exitCode = 1;
    } else console.log('\nPASS: every resize mid-flip ended on the cells\' text');
  } finally {
    clearTimeout(killer);
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    proc.kill();
    await sleep(800);
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Chrome may still hold files */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
