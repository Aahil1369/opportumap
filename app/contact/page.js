'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

export default function ContactPage() {
  const { dark, toggleDark } = useTheme();
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

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    label: dark ? 'text-zinc-400' : 'text-zinc-500',
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <main className="px-4 sm:px-8 py-12 sm:py-20 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-3 ${ui.text}`}>Get in touch</h1>
          <p className={`text-sm sm:text-base ${ui.sub}`}>
            Have a question, feature idea, or want to partner with us? We'd love to hear from you.
          </p>
        </div>

        {submitted ? (
          <div className={`rounded-2xl border p-8 text-center ${ui.card}`}>
            <p className="text-4xl mb-4">✅</p>
            <h2 className={`text-lg font-semibold mb-2 ${ui.text}`}>Message sent!</h2>
            <p className={`text-sm ${ui.sub}`}>Thanks for reaching out. We'll get back to you within 1–2 business days.</p>
            <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
              className="mt-6 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
              Send another message
            </button>
          </div>
        ) : (
          <div className={`rounded-2xl border p-6 sm:p-8 ${ui.card}`}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-medium mb-1.5 block ${ui.label}`}>Your name</label>
                  <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                    placeholder="Aahil Akbar"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1.5 block ${ui.label}`}>Email address</label>
                  <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${ui.input}`} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium mb-1.5 block ${ui.label}`}>Subject</label>
                <input required value={form.subject} onChange={(e) => set('subject', e.target.value)}
                  placeholder="Feature request, bug report, partnership..."
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${ui.input}`} />
              </div>
              <div>
                <label className={`text-xs font-medium mb-1.5 block ${ui.label}`}>Message</label>
                <textarea required value={form.message} onChange={(e) => set('message', e.target.value)} rows={5}
                  placeholder="Tell us what's on your mind..."
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none ${ui.input}`} />
              </div>
              <button type="submit" disabled={sending}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm transition-all">
                {sending ? 'Sending...' : 'Send message'}
              </button>
            </form>
          </div>
        )}

        {/* Contact info */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: '📧', label: 'Email', value: 'hello@opportumap.com' },
            { icon: '🐦', label: 'Twitter', value: '@opportumap' },
            { icon: '💼', label: 'LinkedIn', value: 'OpportuMap' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${ui.card}`}>
              <p className="text-xl mb-1">{c.icon}</p>
              <p className={`text-xs font-semibold ${ui.text}`}>{c.label}</p>
              <p className={`text-xs mt-0.5 ${ui.sub}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
