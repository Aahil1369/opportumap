'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StoryCard from '../components/StoryCard';
import { useTheme } from '../hooks/useTheme';

const COUNTRIES = [
  'Afghanistan','Albania','Argentina','Australia','Bangladesh','Brazil','Canada','China','Colombia',
  'Egypt','Ethiopia','France','Germany','Ghana','India','Indonesia','Iran','Iraq','Japan','Kenya',
  'Malaysia','Mexico','Morocco','Nepal','Nigeria','Pakistan','Philippines','Poland','Russia',
  'Saudi Arabia','South Africa','South Korea','Sri Lanka','Syria','Thailand','Turkey','UAE',
  'Uganda','Ukraine','United Kingdom','United States','Vietnam',
];

export default function StoriesPage() {
  const { dark, toggleDark } = useTheme();
  const isDark = dark;
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

  const inputClass = `w-full px-4 py-2.5 rounded-lg border text-sm ${
    isDark
      ? 'bg-[#0e0e18] border-[#2a2a3e] text-zinc-100 focus:border-indigo-500'
      : 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500'
  } outline-none transition-colors`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080810] text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Stories
          </h1>
          <p className={`text-lg mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Real journeys from people who found opportunities across borders.
          </p>
          {!showForm && !submitted && (
            <button onClick={() => setShowForm(true)}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
              Share Your Story
            </button>
          )}
        </div>

        {submitted && (
          <div className={`p-4 rounded-xl border mb-8 text-center ${
            isDark ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            Thanks for sharing! Your story will appear once approved.
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className={`rounded-xl border p-6 mb-10 ${
            isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Share Your Story</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Where are you from?</label>
                <select value={form.from_country} onChange={e => setForm(f => ({...f, from_country: e.target.value}))}
                  className={inputClass} required>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Where are you now?</label>
                <select value={form.current_country} onChange={e => setForm(f => ({...f, current_country: e.target.value}))}
                  className={inputClass} required>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Your story</label>
              <textarea value={form.story_text} onChange={e => setForm(f => ({...f, story_text: e.target.value}))}
                rows={4} className={inputClass} required
                placeholder="How did you find your opportunity? What was the journey like?" />
            </div>
            <div className="mb-6">
              <label className={`text-sm mb-1 block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setForm(f => ({...f, rating: n}))}
                    className={`text-2xl transition-colors ${n <= form.rating ? 'text-yellow-400' : isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Story'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className={`px-6 py-2.5 rounded-lg border font-medium transition-colors ${
                  isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className={`h-32 rounded-xl animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
            ))}
          </div>
        ) : stories.length > 0 ? (
          <div className="space-y-4">
            {stories.map(story => (
              <StoryCard key={story.id} story={story} isDark={isDark} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className={`text-lg ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              No stories yet. Be the first to share your journey!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
