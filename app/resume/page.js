import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import Scanner from '../components/resume/Scanner';
import '../components/resume/resume.css';

// C · Security: the resume grader as an airport X-ray. The hall header is server-rendered; the
// belt, the scan and the verdict are the Scanner island.
export const metadata = {
  title: 'Resume grader — OpportuMap',
  description:
    'Put your resume through security: an honest, section-by-section grade, the clichés and red flags it would be stopped for, rewrites, and roles you match.',
};

export default function ResumePage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'C', label: 'Security' }}
        title="Put your resume through"
        accent="security."
        sub="Six sections scored, clichés confiscated, red flags raised. Average resumes land 35–55 — that’s the point."
      >
        <Scanner />
        <p className="rs-foot">We grade hard on purpose. An inflated score doesn’t help you land a job.</p>
      </PageShell>
    </>
  );
}
