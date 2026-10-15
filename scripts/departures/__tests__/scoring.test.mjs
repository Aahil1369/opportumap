// app/data/matchJobs.js: one score for a role and a visitor's profile. The board sorts by it
// (best match first), every row's match badge shows it, and BOARDING (jobStatus) is the same
// number past 75. Before, the "Opportunity" sort weighed skills 60/40 with a visa table while
// the badge weighed them 85/15 with another, so a higher badge could sit below a lower one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { scoreJob, rankJobs, matchBadge } = await import(new URL('../../../app/data/matchJobs.js', import.meta.url));
const { jobStatus, BOARDING_SCORE } = await import(new URL('../../../lib/departures/status.js', import.meta.url));

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

const PROFILE = {
  name: 'Test',
  nationality: 'pk',
  experience: '3-5',
  skills: 'react, typescript, node, python, aws',
  jobTypes: ['Software Engineering'],
  resumeSummary: 'Full stack developer building React and Node platforms on AWS.',
};

const OLD = '2026-08-01T00:00:00Z'; // not NEW at NOW, so status can show BOARDING
const NOW = new Date('2026-10-14T12:00:00Z');
const job = (id, title, extra = {}) => ({
  id,
  title,
  company: 'Acme',
  location: 'Toronto, Ontario',
  country: 'ca',
  source: 'adzuna',
  remote: false,
  posted_at: OLD,
  description: '',
  ...extra,
});

const JOBS = [
  job('a', 'Accountant', { description: 'Ledgers and audits.' }),
  job('b', 'Senior React TypeScript Engineer', { description: 'Node services on AWS.' }),
  job('c', 'Nurse', { country: 'gb', location: 'Leeds' }),
  job('d', 'Python Developer', { description: 'Django and AWS.' }),
  job('e', 'Junior Frontend Developer', { description: 'React.' }),
  job('f', 'Full Stack Engineer (React, Node)', { description: 'TypeScript, AWS, Python.' }),
  job('g', 'Accountant', { description: 'Ledgers and audits.' }), // ties with a
  job('h', 'Data Analyst', { description: 'SQL dashboards.' }),
];

test('sorting by scoreJob (best first) matches the order of the badges the rows show', () => {
  const ranked = rankJobs(JOBS, PROFILE);
  assert.deepEqual(ranked.map((j) => j.id).sort(), JOBS.map((j) => j.id).sort(), 'a permutation of the input');
  const shown = ranked.map((j) => matchBadge(j, PROFILE).value);
  for (let i = 1; i < shown.length; i++) {
    assert.ok(shown[i - 1] >= shown[i], `badge ${shown[i - 1]} before ${shown[i]} (${ranked.map((j) => j.id).join(',')})`);
  }
  ranked.forEach((j) => {
    assert.equal(matchBadge(j, PROFILE).value, scoreJob(j, PROFILE), `${j.id}: the badge is scoreJob`);
    assert.equal(j.matchScore, scoreJob(j, PROFILE), `${j.id}: matchScore is scoreJob`);
  });
  assert.ok(new Set(shown).size >= 4, `the fixture spreads the scores (${shown.join(',')})`);
});

test('ties keep the feed order', () => {
  const ranked = rankJobs(JOBS, PROFILE).map((j) => j.id);
  assert.ok(ranked.indexOf('a') < ranked.indexOf('g'));
  const flipped = rankJobs([...JOBS].reverse(), PROFILE).map((j) => j.id);
  assert.ok(flipped.indexOf('g') < flipped.indexOf('a'));
});

test('the badge reads the score as a percentage with a word', () => {
  const b = matchBadge(JOBS[1], PROFILE);
  assert.equal(b.text, `${b.value}%`);
  assert.equal(typeof b.label, 'string');
  assert.ok(b.label.length > 0);
});

test('BOARDING is the same number past 75: status and badge never disagree', () => {
  for (const j of rankJobs(JOBS, PROFILE)) {
    const status = jobStatus(j, { now: NOW, profile: PROFILE });
    const value = matchBadge(j, PROFILE).value;
    assert.equal(status === 'BOARDING', value >= BOARDING_SCORE, `${j.id}: ${status} with badge ${value}`);
  }
  assert.ok(rankJobs(JOBS, PROFILE).some((j) => jobStatus(j, { now: NOW, profile: PROFILE }) === 'BOARDING'));
});

test('without a profile there is no badge and the order is the feed order', () => {
  assert.equal(matchBadge(JOBS[0], null), null);
  assert.deepEqual(rankJobs(JOBS, null).map((j) => j.id), JOBS.map((j) => j.id));
  assert.deepEqual(rankJobs(JOBS, undefined).map((j) => j.id), JOBS.map((j) => j.id));
});

test('rankJobs does not touch its input', () => {
  const copy = JSON.parse(JSON.stringify(JOBS));
  rankJobs(JOBS, PROFILE);
  assert.deepEqual(JOBS, copy);
});

// ── One formula: the old visa-weighted second score is gone everywhere ───────────────────────

function walk(rel) {
  const abs = join(ROOT, rel);
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs).flatMap((name) => walk(join(rel, name)));
}

test('no second scoring formula anywhere in app/ or lib/', () => {
  const found = [];
  for (const f of [...walk('app'), ...walk('lib')].filter((x) => /\.(?:js|mjs)$/.test(x))) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    if (/\bopportunityScore\b|\bgetVisaEase\b|\boppScoreColor\b/.test(src)) found.push(f);
  }
  assert.deepEqual(found, []);
});

test('the job cards and the detail panel show matchBadge', () => {
  for (const f of ['app/components/JobCard.js', 'app/components/JobDetailPanel.js']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.match(src, /\bmatchBadge\b/, `${f} uses matchBadge`);
  }
});
