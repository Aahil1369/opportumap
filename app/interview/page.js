import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import Simulator from '../components/interview/Simulator';
import '../components/interview/interview.css';

// D · Simulator: interview prep as a simulator session. The hall header is server-rendered; the
// briefing, the pre-takeoff checklist and the mock run are the Simulator island.
export const metadata = {
  title: 'Interview prep — OpportuMap',
  description:
    'Rehearse the interview in the simulator: questions built for the role and company, what each one is really assessing, and a mock run that scores every answer out of 10.',
};

export default function InterviewPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'D', label: 'Simulator' }}
        title="Rehearse it in the"
        accent="simulator."
        sub="Questions built for the role, read as a pre-takeoff checklist. Then the mock run: every answer scored out of 10 — average 7 or better and you’re cleared for takeoff."
      >
        <Simulator />
        <p className="iv-foot">Practice out loud. Reading your answer and saying it are different sports.</p>
      </PageShell>
    </>
  );
}
