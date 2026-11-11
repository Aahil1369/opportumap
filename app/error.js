'use client';
// A page that throws shows this in the hall, with a retry, instead of Next's white
// "Application error" screen. What went wrong is never shown to the visitor.
import Link from 'next/link';
import PageShell from './components/kit/PageShell';

export default function PageError({ retry }) {
  return (
    <PageShell title="Something went" accent="wrong." sub="This page hit a problem on our side. Try again, or go back to the board.">
      <p className="ps-sub">
        <button type="button" onClick={() => retry()} className="min-h-[44px] cursor-pointer text-sign underline underline-offset-4">Try again</button>
        {' · '}
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sign underline underline-offset-4">Back to departures →</Link>
      </p>
    </PageShell>
  );
}
