import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import Lounge from '../components/community/Lounge';
import { FOOTNOTES } from '../lib/pageCopy';
import '../components/community/community.css';

// /community — the departure lounge (LOUNGE). The hall header is server-rendered; the composer,
// the feed and the side panel are the client island below, fed by /api/community/*.
export const metadata = {
  title: 'Community — OpportuMap',
  description:
    'The departure lounge: stories, questions, roles and advice from people who moved for work. No recruiters, no pitch threads.',
};

export default function CommunityPage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ label: 'Lounge' }}
        title="Real stories from people"
        accent="already there."
        sub="No recruiters, no pitch threads. Just people who moved for work, and what they learned on the way."
        wide
      >
        <Lounge />
        <p className="lg-foot">{FOOTNOTES.community}</p>
      </PageShell>
    </>
  );
}
