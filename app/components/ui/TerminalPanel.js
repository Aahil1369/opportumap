export default function TerminalPanel({ label, right, children, className = '' }) {
  return (
    <div className={`bg-term-bg text-term-ink ${className}`}>
      {(label || right) && (
        <div className="flex items-center justify-between px-[18px] py-3 border-b border-term-rule font-mono text-[10px] tracking-[0.12em] uppercase text-term-ink-sub">
          <span>{label}</span>
          {right && <span>{right}</span>}
        </div>
      )}
      <div className="px-[18px] py-4">
        {children}
      </div>
    </div>
  );
}
