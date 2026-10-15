// /jobs: the jobs page is the departures board (spec §7). Server-rendered, like the homepage:
// the board's rows are the homepage's own search (HOME_SEARCH, one shared data-cache entry, no
// extra feed calls), fetched at ISR time every 10 minutes and trimmed (boardJobs), so the final
// text of every row is in the HTML and a homepage row's link (/jobs?job=<id>) finds its role.
// JobsBoard layers the motion on after hydration, and re-flaps the rows in place when the
// visitor's own search arrives (a ?q=, their profile's roles and countries). Feeds down or slow
// at ISR time: no server board, and JobsBoard asks for the same search itself.
// Metadata: ./layout.js.
import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import JobsBoard from '../components/jobs/JobsBoard';
import { fetchLiveJobs } from '../../lib/jobsFeed';
import { HOME_SEARCH } from '../../lib/departures/homeSearch';
import { boardJobs } from '../../lib/departures/jobRows';

export const revalidate = 600;

const FEED_TIMEOUT_MS = 6000;

/** { jobs, at } (the board's clock, for NEW and expiry), or null when the feeds gave nothing. */
async function serverBoard() {
  try {
    const jobs = await fetchLiveJobs({
      query: HOME_SEARCH.query,
      countries: [...HOME_SEARCH.countries],
      timeoutMs: FEED_TIMEOUT_MS,
      revalidate,
    });
    const now = new Date();
    const kept = boardJobs(jobs, { now });
    return kept.length ? { jobs: kept, at: now.getTime() } : null;
  } catch {
    return null;
  }
}

export default async function JobsPage() {
  const initial = await serverBoard();
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'A', label: 'JOBS' }}
        title="Where to"
        accent="next?"
        sub="Every row is a real role. Tap one to board."
        wide
      >
        <JobsBoard initial={initial} />
      </PageShell>
    </>
  );
}
