'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StoryCard from '../components/StoryCard';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';

const COUNTRIES = [
  'Afghanistan','Albania','Argentina','Australia','Bangladesh','Brazil','Canada','China','Colombia',
  'Egypt','Ethiopia','France','Germany','Ghana','India','Indonesia','Iran','Iraq','Japan','Kenya',
  'Malaysia','Mexico','Morocco','Nepal','Nigeria','Pakistan','Philippines','Poland','Russia',
  'Saudi Arabia','South Africa','South Korea','Sri Lanka','Syria','Thailand','Turkey','UAE',
  'Uganda','Ukraine','United Kingdom','United States','Vietnam',
];

export default function StoriesPage() {
  useScrollReveal();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ from_country: '', current_country: '', story_text: '', rating: 5 });

  useEffect(() => {
    fetch('/api/stories').then(r => r.json()).then(d => setStories(d.stories || [])).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
      setShowForm(false);
    }
  }

  const inputClass = 'w-full px-4 py-2.5 bg-paper-bg border border-paper-rule text-paper-ink text-sm focus:border-accent outline-none transition-colors';

  const hero = HERO_COPY.stories;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['SUBMITTED BY READERS', 'EDITED FOR LENGTH ONLY', 'NEVER FOR HONESTY']}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14">
          {!showForm && !submitted && (
            <div className="mb-10">
              <Btn variant="primary" as="button" onClick={() => setShowForm(true)}>Share your story</Btn>
            </div>
          )}

          {submitted && (
            <div className="border border-paper-rule bg-paper-bg-alt p-6 mb-10 max-w-[640px]">
              <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-2">// SUBMITTED</div>
              <p className="text-[14px] text-paper-ink-dim leading-[1.55]">
                Thanks for sharing! Your story will appear once approved.
              </p>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="border border-paper-rule bg-paper-bg-alt p-7 mb-10 max-w-[720px]">
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// SHARE YOUR STORY</div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5 block">Where are you from?</label>
                  <select value={form.from_country} onChange={e => setForm(f => ({...f, from_country: e.target.value}))}
                    className={inputClass} required>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5 block">Where are you now?</label>
                  <select value={form.current_country} onChange={e => setForm(f => ({...f, current_country: e.target.value}))}
                    className={inputClass} required>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5 block">Your story</label>
                <textarea value={form.story_text} onChange={e => setForm(f => ({...f, story_text: e.target.value}))}
                  rows={4} className={inputClass} required
                  placeholder="How did you find your opportunity? What was the journey like?" />
              </div>
              <div className="mb-6">
                <label className="font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub mb-1.5 block">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setForm(f => ({...f, rating: n}))}
                      className={`text-2xl transition-colors ${n <= form.rating ? 'text-accent' : 'text-paper-ink-sub'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-[10px]">
                <Btn variant="primary" as="button" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit story'}
                </Btn>
                <Btn variant="secondary" as="button" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Btn>
              </div>
            </form>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-32 border border-paper-rule bg-paper-bg-alt animate-pulse" />
              ))}
            </div>
          ) : stories.length > 0 ? (
            <div className="space-y-4">
              {stories.map(story => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="border border-paper-rule bg-paper-bg-alt p-10 text-center">
              <p className="font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub">
                NO STORIES YET. BE THE FIRST TO SHARE YOUR JOURNEY.
              </p>
            </div>
          )}

          <Footnote>{FOOTNOTES.stories}</Footnote>
        </div>
      </main>
    </div>
  );
}
