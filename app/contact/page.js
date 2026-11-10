'use client';

// /contact — the information desk (i · INFORMATION). The form posts JSON to /api/contact, which
// saves it to the admin inbox (Supabase submit_contact, read on /admin): the visitor's name,
// email, subject and message, validated here and again on the server, with a hidden "hp_ref"
// honeypot only bots fill. On failure the visitor keeps what they typed and sees the server's
// friendly message; on success, the "Message sent." screen. Fields are 16px, each with its label.
// Metadata: ./layout.js.

import { useState } from 'react';
import Navbar from '../components/Navbar';
import PageShell from '../components/kit/PageShell';
import { submitContact, validateContact, CONTACT_LIMITS, SEND_FAILED } from '../../lib/contactForm.js';

const EMPTY = { name: '', email: '', subject: '', message: '' };

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sign';
const label = 'block mb-2 font-mono text-[12px] font-medium tracking-[0.14em] uppercase text-ink-dim';
// The border is --ink-sub at 60% so the field's edge reads (≥ 3:1) on the card.
const field =
  'w-full min-h-[48px] px-3 py-3 rounded-[10px] bg-hall-3 border border-ink-sub/60 text-[16px] leading-[1.4] text-ink placeholder:text-ink-sub focus:outline-2 focus:outline-offset-1 focus:outline-sign';

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [hpRef, setHpRef] = useState(''); // honeypot
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // POST JSON to /api/contact (saved to the admin inbox in Supabase). On failure the
  // visitor keeps what they typed and sees the server's friendly message.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const check = validateContact(form);
    if (!check.ok) { setError(check.error); return; }
    setSending(true);
    setError('');
    try {
      await submitContact({ ...form, hp_ref: hpRef });
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || SEND_FAILED);
    } finally {
      setSending(false);
    }
  };

  const another = () => {
    setSubmitted(false);
    setForm(EMPTY);
    setHpRef('');
  };

  return (
    <>
      <Navbar />
      <PageShell
        sign={{ letter: 'i', label: 'INFORMATION', gate: false }}
        title="Ask the"
        accent="information desk."
        sub="A question, an idea, a partnership or a bug: your message goes straight to the founder, and you'll get a reply by email."
      >
        {submitted ? (
          <div className="rounded-[14px] border border-rule bg-hall-2 p-6 sm:p-8 text-center" role="status">
            <p className="font-mono text-[12px] font-medium tracking-[0.22em] text-ok mb-3">MESSAGE SENT ✓</p>
            <h2 className="font-sans text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em] text-ink mb-2">Message sent.</h2>
            <p className="text-[16px] leading-[1.5] text-ink-dim mb-6 max-w-[46ch] mx-auto">
              Thanks for reaching out. Your message went straight to the founder, and you&apos;ll get a reply by email at the address you gave.
            </p>
            <button
              type="button"
              onClick={another}
              className={`inline-flex items-center justify-center min-h-[48px] px-5 rounded-[10px] border border-rule text-[16px] font-semibold text-ink hover:border-ink-sub ${FOCUS}`}
            >
              Send another message
            </button>
          </div>
        ) : (
          <div className="rounded-[14px] border border-rule bg-hall-2 p-5 sm:p-8">
            <p className="font-mono text-[11px] font-medium tracking-[0.22em] text-sign mb-5">DESK OPEN · REPLIES BY EMAIL</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot: hidden from people, filled only by bots; the API drops those. */}
              <p className="hidden" aria-hidden="true">
                <label>
                  Company (leave this empty)
                  <input name="hp_ref" value={hpRef} onChange={(e) => setHpRef(e.target.value)}
                    tabIndex={-1} autoComplete="off" />
                </label>
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-name" className={label}>Your name</label>
                  <input id="contact-name" name="name" required value={form.name} onChange={(e) => set('name', e.target.value)}
                    placeholder="Jane Doe" maxLength={CONTACT_LIMITS.name} autoComplete="name"
                    className={field} />
                </div>
                <div>
                  <label htmlFor="contact-email" className={label}>Email address</label>
                  <input id="contact-email" name="email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    placeholder="Where should the reply go?" maxLength={CONTACT_LIMITS.email} autoComplete="email"
                    className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="contact-subject" className={label}>Subject</label>
                <input id="contact-subject" name="subject" required value={form.subject} onChange={(e) => set('subject', e.target.value)}
                  placeholder="Feature request, bug report, partnership..." maxLength={CONTACT_LIMITS.subject}
                  className={field} />
              </div>
              <div>
                <label htmlFor="contact-message" className={label}>Message</label>
                <textarea id="contact-message" name="message" required value={form.message} onChange={(e) => set('message', e.target.value)} rows={6}
                  placeholder="Tell us what's on your mind..." maxLength={CONTACT_LIMITS.message}
                  className={`${field} resize-y`} />
              </div>
              {error && (
                <p role="alert" className="text-[16px] leading-[1.45] text-warn">{error}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                className={`w-full min-h-[48px] rounded-[10px] bg-sign text-sign-ink font-sans text-[16px] font-bold disabled:opacity-60 ${FOCUS}`}
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </div>
        )}
        {/* Plain text, not a link: the page exists, but no URL has been confirmed. */}
        <p className="mt-6 text-[16px] leading-[1.5] text-ink-dim">LinkedIn · OpportuMap</p>
      </PageShell>
    </>
  );
}
