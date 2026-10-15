import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import AirmailDesk from '../components/coverLetter/AirmailDesk';
import '../components/coverLetter/coverLetter.css';

// F · Airmail: the cover letter desk. The hall header is server-rendered; the desk (the job, the
// resume, the tone tags), the editable letter and its PAR AVION envelope are the AirmailDesk island.
export const metadata = {
  title: 'Cover letter — OpportuMap',
  description:
    'Write a cover letter for the role you want: paste the job description, pick a tone, edit the draft, then copy it or download it.',
};

export default function CoverLetterPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'F', label: 'Airmail' }}
        title="A letter that sounds like"
        accent="you."
        sub="Paste the job, pick a tone, add your resume if you like. We draft it, you edit it — then it goes out by airmail."
      >
        <AirmailDesk />
        <p className="cl-foot">A good cover letter is short. If ours writes long, trim it — it’s a draft, not a ruling.</p>
      </PageShell>
    </>
  );
}
