'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending — replace with real API route or Formspree/Resend later
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSubmitted(true);
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
            Have a question, feature idea, or want to partner with us? We&apos;d love to hear from you.
          </p>

          {submitted ? (
            <div className="border border-paper-rule bg-paper-bg-alt p-8 text-center">
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// MESSAGE SENT</div>
              <h2 className="font-display text-[24px] leading-[1.15] text-paper-ink mb-2">Message sent.</h2>
              <p className="text-[14px] text-paper-ink-dim mb-6">Thanks for reaching out. We&apos;ll get back to you within 1–2 business days.</p>
              <Btn variant="secondary" as="button" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                Send another message
              </Btn>
            </div>
          ) : (
            <div className="border border-paper-rule p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Your name</label>
                    <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                      placeholder="Aahil Akbar"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email address</label>
                    <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Subject</label>
                  <input required value={form.subject} onChange={(e) => set('subject', e.target.value)}
                    placeholder="Feature request, bug report, partnership..."
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Message</label>
                  <textarea required value={form.message} onChange={(e) => set('message', e.target.value)} rows={5}
                    placeholder="Tell us what's on your mind..."
                    className={`${inputCls} resize-none`} />
                </div>
                <Btn variant="primary" as="button" type="submit" disabled={sending} className="w-full justify-center disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send message'}
                </Btn>
              </form>
            </div>
          )}

          {/* Contact info */}
          <div className="mt-10 grid sm:grid-cols-3 gap-px bg-paper-rule border border-paper-rule">
            {[
              { label: 'Email', value: 'hello@opportumap.com' },
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
