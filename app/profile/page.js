import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import Crew from '../components/profile/Crew';
import '../components/community/community.css';

// /profile — the crew badge (CREW). The hall header is server-rendered; the badge, the member's
// numbers and posts are the client island below (it needs the session). Signed-out visitors
// get a sign-in prompt there, not a redirect.
export const metadata = {
  title: 'Profile — OpportuMap',
  description: 'Your crew badge: your name, your route and your posts in the lounge.',
  robots: { index: false },
};

export default function ProfilePage() {
  return (
    <>
      <Navbar />
      <PageShell
        sign={{ label: 'Crew' }}
        title="Your crew"
        accent="badge."
        sub="Your name, your route and what you've shared in the lounge. Never your email."
        wide
      >
        <Crew />
        <p className="lg-foot">In the lounge, people see your name and your posts. Your email stays with your account.</p>
      </PageShell>
    </>
  );
}
