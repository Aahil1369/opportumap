// The STATUS column: ANY GATE (remote) > NEW (posted < 48 h) > BOARDING (strong match for the
// visitor's profile) > ON TIME. There is no FINAL CALL: jobs carry no real closing date.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { jobStatus } = await import(new URL('../../../lib/departures/status.js', import.meta.url));
const { scoreJob } = await import(new URL('../../../app/data/matchJobs.js', import.meta.url));

const NOW = new Date('2026-10-14T12:00:00Z');
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();
const H = 60 * 60 * 1000;

const STRONG_PROFILE = {
  skills: 'react, typescript, node, graphql, aws',
  experience: '3-5',
  jobTypes: ['Software Engineering', 'DevOps / Cloud'],
};
const STRONG_JOB = {
  title: 'React TypeScript Engineer',
  company: 'Acme',
  location: 'Toronto, Ontario',
  description: 'Node and GraphQL services on AWS, frontend in React.',
  remote: false,
};

test('a remote job is ANY GATE, even when it is new', () => {
  assert.equal(jobStatus({ remote: true, posted_at: ago(1 * H) }, { now: NOW }), 'ANY GATE');
  assert.equal(jobStatus({ remote: false, location: 'Remote', posted_at: ago(1 * H) }, { now: NOW }), 'ANY GATE');
});

test('posted within 48 hours is NEW', () => {
  assert.equal(jobStatus({ remote: false, posted_at: ago(2 * H) }, { now: NOW }), 'NEW');
  assert.equal(jobStatus({ posted_at: ago(47 * H) }, { now: NOW.getTime() }), 'NEW');
  assert.equal(jobStatus({ posted_at: ago(49 * H) }, { now: NOW }), 'ON TIME');
});

test('older jobs without a profile are ON TIME', () => {
  assert.equal(jobStatus({ remote: false, posted_at: ago(5 * 24 * H) }, { now: NOW }), 'ON TIME');
  assert.equal(jobStatus({ posted_at: ago(5 * 24 * H) }), 'ON TIME');
});

test('a missing or broken posted_at is never NEW', () => {
  assert.equal(jobStatus({ remote: false }, { now: NOW }), 'ON TIME');
  assert.equal(jobStatus({ posted_at: null }, { now: NOW }), 'ON TIME');
  assert.equal(jobStatus({ posted_at: 'not a date' }, { now: NOW }), 'ON TIME');
  assert.equal(jobStatus({ posted_at: ago(-30 * 24 * H) }, { now: NOW }), 'ON TIME');
  assert.equal(jobStatus(null, { now: NOW }), 'ON TIME');
});

test('a strong match (scoreJob >= 75) for the visitor\'s profile is BOARDING', () => {
  assert.ok(scoreJob(STRONG_JOB, STRONG_PROFILE) >= 75, `score ${scoreJob(STRONG_JOB, STRONG_PROFILE)}`);
  const old = { ...STRONG_JOB, posted_at: ago(5 * 24 * H) };
  assert.equal(jobStatus(old, { now: NOW, profile: STRONG_PROFILE }), 'BOARDING');
  assert.equal(jobStatus(old, { now: NOW }), 'ON TIME');
  const weak = { skills: 'cobol', experience: '10+', jobTypes: ['Design'] };
  assert.ok(scoreJob(old, weak) < 75);
  assert.equal(jobStatus(old, { now: NOW, profile: weak }), 'ON TIME');
});

test('precedence: ANY GATE > NEW > BOARDING', () => {
  const fresh = { ...STRONG_JOB, posted_at: ago(2 * H) };
  assert.equal(jobStatus(fresh, { now: NOW, profile: STRONG_PROFILE }), 'NEW');
  assert.equal(jobStatus({ ...fresh, remote: true }, { now: NOW, profile: STRONG_PROFILE }), 'ANY GATE');
});
