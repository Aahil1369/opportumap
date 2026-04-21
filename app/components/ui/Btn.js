'use client';
import Link from 'next/link';
import { useMagnetic } from './hooks/useMagnetic';

export default function Btn({ as = 'button', variant = 'primary', href, children, className = '', magnetic = false, ...rest }) {
  const ref = magnetic ? useMagnetic() : null;
  const base = 'inline-flex items-center gap-2 font-sans text-[13px] font-medium tracking-[0.01em] px-[22px] py-3 transition-colors duration-160';
  const variants = {
    primary:   'bg-paper-ink text-paper-bg hover:bg-[#2a3a2f]',
    secondary: 'border border-paper-ink text-paper-ink hover:bg-paper-ink hover:text-paper-bg',
    ghost:     'text-paper-ink relative after:content-[\'\'] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-px after:bg-accent after:transition-all hover:after:w-full px-0 py-1',
    terminal:  'bg-data text-term-bg hover:bg-data-dim font-mono',
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`;
  if (href) {
    return <Link href={href} ref={ref} className={cls} {...rest}>{children}</Link>;
  }
  const Tag = as;
  return <Tag ref={ref} className={cls} {...rest}>{children}</Tag>;
}
