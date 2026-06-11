export default function SectionHead({ number, kicker, title, sub, align = 'left', className = '' }) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <header className={`${alignCls} ${className}`}>
      <div className={`font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 ${align === 'center' ? 'justify-center' : ''} flex items-center gap-3`}>
        <span>§ {String(number).padStart(2, '0')}</span>
        {kicker && <span>· {kicker}</span>}
      </div>
      {title && (
        <h2 className="font-display text-[36px] sm:text-[48px] leading-[1.04] tracking-[-0.015em] font-normal text-paper-ink">
          {title}
        </h2>
      )}
      {sub && (
        <p className="mt-4 text-[15px] sm:text-[17px] leading-[1.55] text-paper-ink-dim max-w-[60ch]">
          {sub}
        </p>
      )}
    </header>
  );
}
