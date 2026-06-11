export default function Footnote({ number = '*', children, className = '' }) {
  return (
    <p className={`mt-20 pt-8 border-t border-paper-rule font-display italic text-[15px] leading-[1.6] text-paper-ink-sub max-w-[58ch] ${className}`}>
      <sup className="text-accent not-italic mr-1">{number}</sup>
      {children}
    </p>
  );
}
