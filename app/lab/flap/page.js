import FlapLab from './FlapLab';

// Step 0 (go/no-go): the split-flap board at homepage size, for the owner's iPhone check.
// Open /lab/flap?fps=1 for the frame-rate overlay. Not indexed.
export const metadata = {
  title: 'Split-flap lab · OpportuMap',
  robots: { index: false },
};

export const viewport = { themeColor: '#0a0b0d' };

export default function FlapLabPage() {
  return (
    <main className="om-hall flex-1 px-4 pb-16 pt-5 sm:px-8">
      <div className="mx-auto w-full max-w-[980px]">
        <header className="flex items-center justify-between pb-8">
          <span className="text-[17px] font-extrabold tracking-[-0.01em]">
            <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-[3px] bg-[var(--sign)] align-[-1px]" />
            opportumap
          </span>
          <span className="font-mono text-[12px] tracking-[0.16em] text-[var(--ink-sub)]">
            LAB · STEP 0
          </span>
        </header>

        <p className="font-mono text-[12px] tracking-[0.22em] text-[var(--sign)]">
          DEPARTURES · روانگی · DÉPARTS
        </p>
        <h1 className="mt-3 max-w-[14ch] text-[clamp(32px,8.4vw,64px)] font-extrabold leading-[1.02] tracking-[-0.025em]">
          The world is hiring. <em className="not-italic text-[var(--sign)]">Pick your gate.</em>
        </h1>
        <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.5] text-[var(--ink-dim)]">
          Split-flap prototype: real-looking roles, local time and local pay. Only the characters
          that change flip. The board re-flaps every 4 seconds.
        </p>

        <div className="mt-8">
          <FlapLab />
        </div>

        <p className="mt-6 text-[16px] leading-[1.5] text-[var(--ink-sub)]">
          Sample rows, not live listings. Add <code className="font-mono text-[var(--ink-dim)]">?fps=1</code> to
          the address for the frame meter.
        </p>
      </div>
    </main>
  );
}
