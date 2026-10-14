'use client';

// A modal dialog: role="dialog" + aria-modal, named by `labelledBy` (an element id) or `label`.
// While open: focus moves in (initialFocusRef, else the first [data-autofocus], else the first
// focusable, else the panel) and Tab / Shift+Tab stay inside; Esc or a click on the backdrop
// calls onClose; the page behind does not scroll (html/body overflow hidden, the scrollbar's
// width kept) and Lenis leaves it alone (data-lenis-prevent), while the panel scrolls itself.
// On close focus returns to returnFocusRef, else to whatever had it before (a tap on iOS does
// not focus a button, so pass returnFocusRef for menu buttons). Rendered into document.body,
// so a transformed ancestor never traps the fixed overlay. Nested dialogs: the top one owns
// the keyboard.
//
// placement: 'center' (a card) | 'right' (a full-height drawer). className styles the panel.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import './kit.css';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const open = []; // open dialogs, the top one last
let locks = 0;
let saved = null;

function lockScroll() {
  if (locks++ > 0) return;
  const html = document.documentElement;
  const { body } = document;
  const bar = window.innerWidth - html.clientWidth;
  saved = { html: html.style.overflow, body: body.style.overflow, pad: body.style.paddingRight };
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  if (bar > 0) body.style.paddingRight = `${bar}px`;
}

function unlockScroll() {
  if (--locks > 0 || !saved) return;
  const html = document.documentElement;
  html.style.overflow = saved.html;
  document.body.style.overflow = saved.body;
  document.body.style.paddingRight = saved.pad;
  saved = null;
}

function focusables(panel) {
  return Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

const subscribeNothing = () => () => {};
/** false on the server and during hydration, true after: the portal needs document.body. */
const useIsClient = () => useSyncExternalStore(subscribeNothing, () => true, () => false);

export default function Dialog({
  open: isOpen,
  onClose,
  labelledBy,
  label,
  children,
  className,
  placement = 'center',
  initialFocusRef,
  returnFocusRef,
}) {
  const client = useIsClient();
  const panel = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const el = panel.current;
    if (!isOpen || !client || !el) return undefined;
    const opener = document.activeElement;
    const me = { el };
    open.push(me);
    lockScroll();
    const first = initialFocusRef?.current || el.querySelector('[data-autofocus]') || focusables(el)[0] || el;
    first.focus({ preventScroll: true });

    const onKey = (e) => {
      if (open.at(-1) !== me) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(el);
      const active = document.activeElement;
      if (!items.length) {
        e.preventDefault();
        el.focus({ preventScroll: true });
      } else if (e.shiftKey && (active === items[0] || !el.contains(active) || active === el)) {
        e.preventDefault();
        items.at(-1).focus();
      } else if (!e.shiftKey && (active === items.at(-1) || !el.contains(active))) {
        e.preventDefault();
        items[0].focus();
      }
    };
    const onFocusIn = (e) => {
      if (open.at(-1) !== me || el.contains(e.target)) return;
      (focusables(el)[0] || el).focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn);
      open.splice(open.indexOf(me), 1);
      unlockScroll();
      // The element to return to as it is now, at close (the opener may have re-rendered).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const back = returnFocusRef?.current || opener;
      if (back?.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
    };
  }, [isOpen, client, initialFocusRef, returnFocusRef]);

  if (!isOpen || !client) return null;
  return createPortal(
    <div className="dlg-root" data-placement={placement} data-lenis-prevent="">
      <div className="dlg-backdrop" aria-hidden="true" onClick={() => onCloseRef.current?.()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={className ? `dlg ${className}` : 'dlg'}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
