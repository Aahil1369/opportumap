// Measures the gzipped JavaScript a page loads.
//
//   node scripts/perf/js-size.mjs <url>
//
// Fetches the HTML at <url>, collects every <script src="..."> (resolved
// relative to <url>), fetches each one, gzips it with node:zlib and prints one
// line per chunk plus a final `TOTAL_GZIP_KB <n>` line. No dependencies.
//
// Next 16 / Turbopack no longer prints per-route "First Load JS" from
// `next build`, so this is how the homepage JS budget is tracked:
//
//   npm run build && npx next start -p 3300
//   node scripts/perf/js-size.mjs http://localhost:3300/

import { gzipSync } from 'node:zlib';

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/perf/js-size.mjs <url>');
  process.exit(2);
}

async function fetchOk(target) {
  const res = await fetch(target);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${target}`);
  return res;
}

const html = await (await fetchOk(url)).text();

// <script ... src="..."> in either attribute order; inline scripts have no src.
const srcs = new Set();
for (const tag of html.matchAll(/<script\b[^>]*>/gi)) {
  const m = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag[0]);
  if (m) srcs.add(new URL(m[1] ?? m[2], url).href);
}

let totalBytes = 0;
for (const src of srcs) {
  const body = Buffer.from(await (await fetchOk(src)).arrayBuffer());
  const gz = gzipSync(body, { level: 9 }).length;
  totalBytes += gz;
  console.log(`${(gz / 1024).toFixed(1).padStart(8)} KB gzip  ${(body.length / 1024).toFixed(1).padStart(8)} KB raw  ${new URL(src).pathname}`);
}

console.log(`TOTAL_GZIP_KB ${(totalBytes / 1024).toFixed(1)}`);
