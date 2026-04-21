export default function Kicker({ children, rule = true, className = '' }) {
  return (
    <div className={`font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub flex items-center gap-3 ${className}`}>
      {rule && <span className="inline-block w-7 h-px bg-paper-ink-sub" aria-hidden />}
      <span>{children}</span>
    </div>
  );
}
