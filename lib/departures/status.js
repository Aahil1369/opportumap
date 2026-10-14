// The STATUS column. Precedence: ANY GATE (remote) > NEW (posted in the last 48 h) > BOARDING
// (a strong match for the visitor's profile) > ON TIME. No FINAL CALL: feeds give no real
// closing date, so the board never invents urgency.
import { scoreJob } from '../../app/data/matchJobs.js';
import { isRemotePlace } from './remote.js';

const NEW_FOR_MS = 48 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 60 * 1000; // a feed clock a little ahead still counts as new
export const BOARDING_SCORE = 75;

function postedAt(job) {
  const raw = job.posted_at;
  if (raw == null || raw === '') return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

/** jobStatus(job, { now, profile }) -> 'ANY GATE' | 'NEW' | 'BOARDING' | 'ON TIME'. */
export function jobStatus(job, { now = Date.now(), profile } = {}) {
  if (!job || typeof job !== 'object') return 'ON TIME';
  if (job.remote === true || isRemotePlace(job.location)) return 'ANY GATE';
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const t = postedAt(job);
  if (t != null && Number.isFinite(nowMs)) {
    const age = nowMs - t;
    if (age >= -CLOCK_SKEW_MS && age < NEW_FOR_MS) return 'NEW';
  }
  if (profile && scoreJob(job, profile) >= BOARDING_SCORE) return 'BOARDING';
  return 'ON TIME';
}
