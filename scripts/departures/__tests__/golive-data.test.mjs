// Go-live fix wave (Ruling R28, review findings jobs-s6 and experience-s3): a profile this device
// remembered from the old site can hold its skills as a list, a feed can send a description that
// is not text, and jobTypes is not always a list. app/data/matchJobs.js scoreJob read all three as
// their expected type and threw, and /jobs and /saved render their rows with no try/catch, so a
// returning visitor got an error page on every load until they cleared the site's data. Scoring
// now reads each for what it holds, and everything that reaches it (the match badge, the sort,
// BOARDING, the rows, a country's arrivals, the homepage board) keeps working.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { scoreJob, rankJobs, matchBadge } = await import(new URL('../../../app/data/matchJobs.js', import.meta.url));
const { jobStatus } = await import(new URL('../../../lib/departures/status.js', import.meta.url));
const { jobRow, sortJobs } = await import(new URL('../../../lib/departures/jobRows.js', import.meta.url));
const { countryArrivals } = await import(new URL('../../../lib/departures/mapData.js', import.meta.url));
const { boardRowsFrom } = await import(new URL('../../../lib/departures/board.js', import.meta.url));

const NOW = new Date('2026-10-14T12:00:00Z');
const JOB = {
  id: 'adzuna_1',
  title: 'Senior Python Developer',
  company: 'Acme',
  location: 'Toronto, Ontario',
  country: 'ca',
  currency: 'CAD',
  source: 'adzuna',
  remote: false,
  salary_min: 88000,
  salary_max: 102000,
  lng: -79.38,
  lat: 43.65,
  posted_at: '2026-08-01T00:00:00Z', // not NEW at NOW, so status can show BOARDING
  description: 'SQL pipelines on AWS.',
};

// The profile as the site saves it now, and with nothing a score could read.
const TEXT = { experience: '5-10', skills: 'SQL, Python', jobTypes: ['Software Engineering'] };
const BARE = { experience: '5-10', skills: '', jobTypes: [] };

const isScore = (n) => Number.isInteger(n) && n >= 0 && n <= 99;

test('scoreJob: skills saved as a list score like the same skills as text', () => {
  const list = { ...TEXT, skills: ['SQL', 'Python'] };
  assert.equal(scoreJob(JOB, list), scoreJob(JOB, TEXT));
  assert.ok(scoreJob(JOB, list) > scoreJob(JOB, { ...TEXT, skills: '' }), 'the listed skills count');
  assert.equal(scoreJob(JOB, { ...TEXT, skills: [] }), scoreJob(JOB, { ...TEXT, skills: '' }), 'an empty list is no skills');
});

test('scoreJob: skills that are neither text nor a list never throw', () => {
  const none = scoreJob(JOB, { ...TEXT, skills: '' });
  for (const skills of [42, true, { a: 1 }, null, undefined, 0]) {
    const score = scoreJob(JOB, { ...TEXT, skills });
    assert.ok(isScore(score), `${JSON.stringify(skills)} -> ${score}`);
    assert.equal(score, none, `${JSON.stringify(skills)} matches no skill`);
  }
  // The resume summary goes through the same reader.
  assert.ok(isScore(scoreJob(JOB, { ...TEXT, resumeSummary: ['Python developer', 'SQL'] })));
  assert.ok(isScore(scoreJob(JOB, { ...TEXT, resumeSummary: 7 })));
});

test('scoreJob: a description that is not text never throws', () => {
  const plain = scoreJob(JOB, TEXT);
  const empty = scoreJob({ ...JOB, description: '' }, TEXT);
  assert.ok(plain > empty, 'the fixture’s description carries a skill');
  assert.equal(scoreJob({ ...JOB, description: ['SQL pipelines on AWS.'] }, TEXT), plain, 'a list is read as its text');
  for (const description of [12345, true, { html: '<p>SQL</p>' }, null, undefined, 0]) {
    const score = scoreJob({ ...JOB, description }, TEXT);
    assert.ok(isScore(score), `${JSON.stringify(description)} -> ${score}`);
    assert.equal(score, empty, `${JSON.stringify(description)} holds no skill`);
  }
});

test('scoreJob: jobTypes that is not a list counts as no job types', () => {
  const none = scoreJob(JOB, { ...TEXT, jobTypes: [] });
  assert.ok(scoreJob(JOB, TEXT) > none, 'the fixture’s job type counts when it is a list');
  for (const jobTypes of [7, true, { 0: 'Software Engineering' }, 'Software Engineering', null, undefined]) {
    const score = scoreJob(JOB, { ...TEXT, jobTypes });
    assert.ok(isScore(score), `${JSON.stringify(jobTypes)} -> ${score}`);
    assert.equal(score, none, `${JSON.stringify(jobTypes)} is no list`);
  }
});

test('an old saved profile and an odd feed role: the badge, the sort, the status and the boards all still work', () => {
  const OLD = { experience: '5-10', skills: ['SQL', 'Python'], jobTypes: 7 }; // every guard at once
  const CLEAN = { experience: '5-10', skills: 'SQL, Python', jobTypes: [] };
  const odd = { ...JOB, id: 'adzuna_2', description: 12345 };
  const jobs = [odd, JOB];

  assert.deepEqual(matchBadge(JOB, OLD), matchBadge(JOB, CLEAN));
  assert.deepEqual(matchBadge(odd, OLD), matchBadge(odd, CLEAN));
  assert.deepEqual(rankJobs(jobs, OLD), rankJobs(jobs, CLEAN));
  assert.deepEqual(rankJobs(jobs, OLD).map((j) => j.id), ['adzuna_1', 'adzuna_2'], 'the role whose description matches leads');
  assert.deepEqual(sortJobs(jobs, 'match', OLD), sortJobs(jobs, 'match', CLEAN));
  assert.equal(jobStatus(JOB, { now: NOW, profile: OLD }), jobStatus(JOB, { now: NOW, profile: CLEAN }));
  assert.equal(jobStatus(odd, { now: NOW, profile: OLD }), 'ON TIME');
  assert.deepEqual(jobRow(JOB, { now: NOW, profile: OLD }), jobRow(JOB, { now: NOW, profile: CLEAN }));
  assert.deepEqual(jobRow(odd, { now: NOW, profile: OLD }), jobRow(odd, { now: NOW, profile: CLEAN }));
  assert.equal(typeof jobRow(odd, { now: NOW, profile: OLD }).match.value, 'number');

  const arrivals = countryArrivals(jobs, 'ca', { now: NOW, profile: OLD });
  assert.deepEqual(arrivals, countryArrivals(jobs, 'ca', { now: NOW, profile: CLEAN }));
  assert.deepEqual(arrivals.map((r) => r.id).sort(), ['adzuna_1', 'adzuna_2']);

  // boardRowsFrom swallows a throwing role, so a crash here showed as the sample board instead.
  const board = boardRowsFrom(jobs, { now: NOW, profile: OLD, fill: [] });
  assert.deepEqual(board, boardRowsFrom(jobs, { now: NOW, profile: CLEAN, fill: [] }));
  assert.equal(board.length, 1, 'a real role, not the fill (this board shows a city once)');
  assert.equal(board[0].cells.role, 'Senior Python Developer');
});
