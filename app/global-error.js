'use client';
// The last net: shown when the root layout itself throws. It replaces that layout, so it brings its
// own <html> and <body> and the global sheet (the hall palette). Nothing else is imported, so
// nothing here can throw a second time, and what went wrong is never shown to the visitor.
// The layout's web fonts are not loaded here: the two font variables fall back to system fonts.
import './globals.css';

export default function GlobalError({ retry }) {
  return (
    <html lang="en" className="h-full antialiased [--font-inter:system-ui] [--font-jb-mono:ui-monospace]">
      <body className="min-h-full flex flex-col bg-hall text-ink">
        <title>Something went wrong — OpportuMap</title>
        <main className="mx-auto w-full max-w-[880px] px-4 py-16">
          <h1 className="text-[32px] font-extrabold leading-tight">
            Something went <em className="not-italic text-sign">wrong.</em>
          </h1>
          <p className="mt-3 text-[16px] leading-normal text-ink-dim">
            The site hit a problem on our side. Try again, or go back to the board.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-6 text-[16px]">
            <button type="button" onClick={() => retry()} className="min-h-[44px] cursor-pointer text-sign underline underline-offset-4">
              Try again
            </button>
            {/* A plain link, on purpose: the router may be what broke, and a full load starts clean. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="inline-flex min-h-[44px] items-center text-sign underline underline-offset-4">Back to departures →</a>
          </p>
        </main>
      </body>
    </html>
  );
}
