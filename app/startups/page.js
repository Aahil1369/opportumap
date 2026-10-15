import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import Hangar from '../components/startups/Hangar';
import '../components/startups/startups.css';

// /startups — the hangar (E · HANGAR). The hall header is server-rendered; the stands (the
// startups, their fins, the chips) are the client island below, fed by GET /api/startups.
export const metadata = {
  title: 'Startups — OpportuMap',
  description:
    'Early-stage startups, posted by their founders. Board one as a passenger, go on standby, or message the founder.',
};

export default function StartupsPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'E', label: 'Hangar' }}
        title="Back a startup before it"
        accent="takes off."
        sub="Early-stage companies, posted by their founders. Board one as a passenger, go on standby, or message the founder."
        wide
      >
        <Hangar />
        <p className="hg-foot">Early-stage means early-stage. Due diligence is your job.</p>
      </PageShell>
    </>
  );
}
