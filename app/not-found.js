// The 404, in the hall. Next's default page paints itself white (its inline body style is not in a
// cascade layer, so it beats the layout's bg-hall) and shows no navbar.
import Link from 'next/link';
import Navbar from './components/Navbar';
import PageShell from './components/kit/PageShell';

export const metadata = { title: 'Page not found — OpportuMap', robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Navbar />
      <PageShell title="This gate is" accent="closed." sub="That page isn’t on the board: the link may be old or mistyped.">
        <p className="ps-sub">
          <Link href="/jobs" className="inline-flex min-h-[44px] items-center text-sign underline underline-offset-4">See every role on the board →</Link>
        </p>
      </PageShell>
    </>
  );
}
