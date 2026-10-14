// Measures Largest Contentful Paint on a throttled phone profile.
//
//   node scripts/perf/lcp.mjs <url>
//
// Headless Chrome over the DevTools protocol (copied from Migrova, same launch pattern as
// its scripts/sources/lib/fetchPage.mjs): 375x812 mobile viewport, 4x CPU slowdown,
// ~1.6 Mbps down / 750 kbps up / 150 ms latency, cache disabled. Loads <url>, lets the page
// settle, then reads the last (largest) `largest-contentful-paint` entry. Prints
// `LCP <ms>` (plus the element) and exits 1 when LCP > 2500 ms. No dependencies.
//
//   npm run build && npx next start -p 3300
//   node scripts/perf/lcp.mjs http://localhost:3300/

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BUDGET_MS = 2500;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/perf/lcp.mjs <url>');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LCP_EXPRESSION = `new Promise((resolve) => {
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (!last) return resolve(null);
    const el = last.element;
    resolve({
      startTime: last.startTime,
      size: last.size,
      url: last.url || '',
      element: el ? el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') : '',
      text: el ? (el.textContent || '').trim().slice(0, 60) : '',
      candidates: entries.length,
    });
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => resolve(null), 3000);
})`;

async function measure() {
  const dir = mkdtempSync(join(tmpdir(), 'lcp-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${dir}`, '--remote-debugging-port=0', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  const killer = setTimeout(() => proc.kill(), 120_000); // never leave Chrome running
  let ws;
  try {
    let portFile = null;
    for (let i = 0; i < 100 && !portFile; i++) {
      try { portFile = readFileSync(join(dir, 'DevToolsActivePort'), 'utf8').split('\n'); } catch { await sleep(100); }
    }
    if (!portFile) throw new Error('Chrome did not start (DevToolsActivePort missing)');
    ws = new WebSocket(`ws://127.0.0.1:${portFile[0].trim()}${portFile[1].trim()}`);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let nextId = 1;
    const pending = new Map();
    const listeners = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      else listeners.forEach((fn) => fn(msg));
    };
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
      const id = nextId++;
      pending.set(id, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)));
      ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    });

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    let loaded = false;
    listeners.push((m) => {
      if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') loaded = true;
    });

    await send('Page.enable', {}, sessionId);
    await send('Network.enable', {}, sessionId);
    await send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true }, sessionId);
    await send('Emulation.setUserAgentOverride', { userAgent: MOBILE_UA }, sessionId);
    await send('Emulation.setCPUThrottlingRate', { rate: 4 }, sessionId);
    await send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 200000, // bytes/s ≈ 1.6 Mbps
      uploadThroughput: 93750, // bytes/s = 750 kbps
    }, sessionId);

    const started = Date.now();
    await send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 600 && !loaded; i++) await sleep(100);
    if (!loaded) throw new Error('page did not fire load within 60s');
    await sleep(3000); // let late candidates (post-hydration paints) report

    const result = await send('Runtime.evaluate', { expression: LCP_EXPRESSION, awaitPromise: true, returnByValue: true }, sessionId);
    return { lcp: result?.result?.value || null, loadMs: Date.now() - started };
  } finally {
    clearTimeout(killer);
    try { ws?.close(); } catch { /* ignore */ }
    proc.kill();
    await sleep(300);
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* Chrome may still hold files */ }
  }
}

try {
  const { lcp, loadMs } = await measure();
  if (!lcp) {
    console.error('no largest-contentful-paint entry recorded');
    process.exit(1);
  }
  const ms = Math.round(lcp.startTime);
  console.log(`LCP ${ms}`);
  console.log(`  element: ${lcp.element}${lcp.text ? ` "${lcp.text}"` : ''}${lcp.url ? ` ${lcp.url}` : ''}`);
  console.log(`  size: ${lcp.size}px²  candidates: ${lcp.candidates}  load: ${loadMs}ms (throttled)`);
  if (ms > BUDGET_MS) {
    console.error(`LCP ${ms}ms is over the ${BUDGET_MS}ms budget`);
    process.exit(1);
  }
} catch (e) {
  console.error(`lcp: ${e.message || e}`);
  process.exit(1);
}
