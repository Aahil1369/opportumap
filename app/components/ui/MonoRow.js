export default function MonoRow({ label, value, meta, accent = false, href, className = '' }) {
  const content = (
    <div className={`grid grid-cols-[1fr_auto_auto] gap-[14px] items-center font-mono text-[11px] leading-[1.4] py-[13px] border-b border-term-rule ${className}`}>
      <div className="text-term-ink">{label}</div>
      {meta && <div className="text-term-ink-sub text-[10px]">{meta}</div>}
      <div className={accent ? 'text-data font-medium' : 'text-term-ink-sub'}>{value}</div>
    </div>
  );
  if (href) return <a href={href} className="block hover:bg-term-bg-alt">{content}</a>;
  return content;
}
