'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { FOOTNOTES } from '../lib/pageCopy';
import { submitContactForm, CONTACT_LIMITS } from '../../lib/contactForm.js';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function ContactPage() {
  useScrollReveal();
  const [form, setForm] = useState(EMPTY);
  const [botField, setBotField] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Netlify Forms: POST urlencoded to the static skeleton in public/__forms.html.
  // On failure the visitor keeps what they typed and sees a real error.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      await submitContactForm({ ...form, botField });
      setSubmitted(true);
    } catch {
      setError('Could not send — please try again.');
    } finally {
      setSending(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 bg-paper-bg border border-paper-rule text-[14px] text-paper-ink placeholder-paper-ink-sub outline-none focus:border-accent transition-colors';
  const labelCls = 'font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-1.5 block';

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" />
          <span>§ CONTACT</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">Get in touch.</h1>
      </section>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 max-w-2xl">
          <p className="text-[14px] text-paper-ink-dim leading-[1.55] mb-8">
            Have a question, feature idea, or want to partner with us? Your message goes straight to the
            founder&apos;s inbox, and you&apos;ll get a reply by email.
          </p>

          {submitted ? (
            <div className="border border-paper-rule bg-paper-bg-alt p-8 text-center" role="status">
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">{'// MESSAGE SENT'}</div>
              <h2 className="font-display text-[24px] leading-[1.15] text-paper-ink mb-2">Message sent.</h2>
              <p className="text-[14px] text-paper-ink-dim mb-6">Thanks for reaching out. It&apos;s in the founder&apos;s inbox, and the reply will come to the email address you gave.</p>
              <Btn variant="secondary" as="button" onClick={() => { setSubmitted(false); setForm(EMPTY); setBotField(''); }}>
                Send another message
              </Btn>
            </div>
          ) : (
            <div className="border border-paper-rule p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot: hidden from people, filled only by bots; Netlify drops those. */}
                <p className="hidden" aria-hidden="true">
                  <label>
                    Leave this empty
                    <input name="bot-field" value={botField} onChange={(e) => setBotField(e.target.value)}
                      tabIndex={-1} autoComplete="off" />
                  </label>
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className={labelCls}>Your name</label>
                    <input id="contact-name" name="name" required value={form.name} onChange={(e) => set('name', e.target.value)}
                      placeholder="Jane Doe" maxLength={CONTACT_LIMITS.name} autoComplete="name"
                      className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className={labelCls}>Email address</label>
                    <input id="contact-email" name="email" required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="Where should the reply go?" maxLength={CONTACT_LIMITS.email} autoComplete="email"
                      className={inputCls} />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-subject" className={labelCls}>Subject</label>
                  <input id="contact-subject" name="subject" required value={form.subject} onChange={(e) => set('subject', e.target.value)}
                    placeholder="Feature request, bug report, partnership..." maxLength={CONTACT_LIMITS.subject}
                    className={inputCls} />
                </div>
                <div>
                  <label htmlFor="contact-message" className={labelCls}>Message</label>
                  <textarea id="contact-message" name="message" required value={form.message} onChange={(e) => set('message', e.target.value)} rows={5}
                    placeholder="Tell us what's on your mind..." maxLength={CONTACT_LIMITS.message}
                    className={`${inputCls} resize-none`} />
                </div>
                {error && (
                  <p role="alert" className="font-mono text-[12px] text-accent">{error}</p>
                )}
                <Btn variant="primary" as="button" type="submit" disabled={sending} className="w-full justify-center disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send message'}
                </Btn>
              </form>
            </div>
          )}

          {/* Contact info */}
          <div className="reveal mt-10 grid sm:grid-cols-3 gap-px bg-paper-rule border border-paper-rule">
            {[
              { label: 'Replies', value: 'By email' },
              { label: 'Twitter', value: '@opportumap' },
              { label: 'LinkedIn', value: 'OpportuMap' },
            ].map((c) => (
              <div key={c.label} className="bg-paper-bg p-4 text-center">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-1">{c.label}</p>
                <p className="text-[13px] text-paper-ink">{c.value}</p>
              </div>
            ))}
          </div>

          <Footnote>{FOOTNOTES.contact}</Footnote>
        </div>
      </main>
    </div>
  );
}
