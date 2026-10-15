// /jobs: the jobs page is the departures board (spec §7). The hall header (gate sign A · JOBS,
// "Where to next?") is server-rendered; the board itself is a client island (JobsBoard), because
// its rows are the visitor's own search: their ?q=, their profile's roles and countries.
// Metadata: ./layout.js.
import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import JobsBoard from '../components/jobs/JobsBoard';

export default function JobsPage() {
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
        <JobsBoard />
      </PageShell>
    </>
  );
}
