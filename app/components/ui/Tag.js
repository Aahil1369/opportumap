export default function Tag({ children, variant = 'paper', className = '' }) {
  const styles = {
    paper:    'bg-paper-ink text-paper-bg',
    terminal: 'bg-data text-term-bg',
    outline:  'border border-paper-ink text-paper-ink',
    moss:     'bg-term-bg text-term-ink border border-term-rule',
  };
  return (
    <span className={`inline-block font-mono text-[10px] tracking-[0.08em] uppercase px-[7px] py-[4px] ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
