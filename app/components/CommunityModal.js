'use client';

import { useState, useEffect } from 'react';
import { ADZUNA_COUNTRIES } from '../data/countries';

const SEED_POSTS = [
  { id: 's1', name: 'Priya Sharma', title: 'Data Scientist', company: 'Spotify', country: 'se', city: 'Stockholm', date: '2026-05-01', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=data+scientist+spotify+stockholm', bio: 'Moving from Bangalore. Looking for a roommate in Södermalm or Vasastan area. Non-smoker, early riser.', avatar: 'PS' },
  { id: 's2', name: 'Marcus Weber', title: 'Software Engineer', company: 'N26', country: 'de', city: 'Berlin', date: '2026-04-15', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=software+engineer+n26+berlin', bio: 'Relocating from São Paulo. Happy to split a 2-bedroom in Mitte or Prenzlauer Berg. Love cycling and coffee.', avatar: 'MW' },
  { id: 's3', name: 'Amara Osei', title: 'ML Engineer', company: 'DeepMind', country: 'gb', city: 'London', date: '2026-04-01', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=ml+engineer+deepmind+london', bio: 'Coming from Accra, Ghana. Looking for flatmates in East London (Stratford/Hackney). Budget ~£900/mo.', avatar: 'AO' },
  { id: 's4', name: 'Kenji Tanaka', title: 'Product Manager', company: 'Grab', country: 'sg', city: 'Singapore', date: '2026-05-15', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=product+manager+grab+singapore', bio: 'Moving from Tokyo. Looking for a room in Toa Payoh or Tampines. Interested in connecting with other expats.', avatar: 'KT' },
  { id: 's5', name: 'Sofia Andersen', title: 'Frontend Engineer', company: 'Shopify', country: 'ca', city: 'Toronto', date: '2026-04-20', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=frontend+engineer+shopify+toronto', bio: 'Relocating from Copenhagen. Looking for a roommate in Scarborough or North York. Into hiking and food.', avatar: 'SA' },
  { id: 's6', name: 'Ravi Patel', title: 'DevOps Engineer', company: 'Atlassian', country: 'au', city: 'Sydney', date: '2026-05-01', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=devops+engineer+atlassian+sydney', bio: 'Moving from London. Looking for room in Parramatta or near Circular Quay. Budget AUD $1,500/mo.', avatar: 'RP' },
  { id: 's7', name: 'Fatima Al-Hassan', title: 'Backend Developer', company: 'Booking.com', country: 'nl', city: 'Amsterdam', date: '2026-06-01', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=backend+developer+booking+amsterdam', bio: 'Coming from Dubai. Looking for a room in Amsterdam Noord or Bijlmer. Budget €1,200/mo.', avatar: 'FA' },
  { id: 's8', name: 'Liam O\'Brien', title: 'Cloud Architect', company: 'Microsoft', country: 'us', city: 'Seattle', date: '2026-04-01', linkedin: 'https://www.linkedin.com/search/results/people/?keywords=cloud+architect+microsoft+seattle', bio: 'Moving from Dublin. Looking for roommates in Bellevue or Redmond. Big soccer fan.', avatar: 'LO' },
];

export default function CommunityModal({ onClose, dark, profile }) {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name || '',
    title: profile?.jobTypes?.[0] || '',
    company: '',
    country: '',
    city: '',
    date: '',
    bio: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('opportumap_community') || '[]');
    setPosts([...saved, ...SEED_POSTS]);
  }, []);

  const filtered = filter === 'all' ? posts : posts.filter(p => p.country === filter);
  const activeCountries = [...new Set(posts.map(p => p.country))];

  const handlePost = () => {
    if (!form.name || !form.country || !form.title) return;
    const newPost = { ...form, id: `u_${Date.now()}`, avatar: form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() };
    const saved = JSON.parse(localStorage.getItem('opportumap_community') || '[]');
    const updated = [newPost, ...saved];
    localStorage.setItem('opportumap_community', JSON.stringify(updated));
    setPosts([newPost, ...posts]);
    setSubmitted(true);
    setShowForm(false);
  };

  const countryOf = (code) => ADZUNA_COUNTRIES.find(c => c.code === code);

  const ui = {
    bg: dark ? 'bg-[#1a1a1d]' : 'bg-white',
    border: dark ? 'border-[#2a2a2e]' : 'border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#2a2a2e] border-[#3a3a3e] text-zinc-100 placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900',
    card: dark ? 'bg-[#111113] border-[#2a2a2e] hover:border-indigo-500/40' : 'bg-zinc-50 border-zinc-200 hover:border-indigo-300',
    pill: (a) => a ? 'bg-indigo-600 text-white' : dark ? 'bg-[#2a2a2e] text-zinc-400 hover:bg-[#333]' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[92vh] flex flex-col ${ui.bg} ${ui.border}`}>

        {/* Header */}
        <div className={`px-6 pt-5 pb-4 border-b ${ui.border} flex items-center justify-between flex-shrink-0`}>
          <div>
            <h2 className={`text-lg font-bold ${ui.text}`}>Community — Find Your People</h2>
            <p className={`text-xs mt-0.5 ${ui.sub}`}>Connect with others relocating to the same city</p>
          </div>
          <button onClick={onClose} className={`text-lg px-2 ${ui.sub}`}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Post your move CTA */}
          {!submitted && !showForm && (
            <button onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-500/40 text-sm font-medium text-indigo-400 hover:bg-indigo-500/5 transition-all">
              + Post your move — find roommates &amp; connections
            </button>
          )}

          {/* Post form */}
          {showForm && (
            <div className={`rounded-xl border p-4 space-y-3 ${ui.card}`}>
              <p className={`text-sm font-semibold ${ui.text}`}>Tell the community about your move</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs mb-1 block ${ui.sub}`}>Your name</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Aahil" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${ui.sub}`}>Job title</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Software Engineer" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${ui.input}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs mb-1 block ${ui.sub}`}>Company</label>
                  <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                    placeholder="e.g. Google" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${ui.sub}`}>Moving to</label>
                  <select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${ui.input}`}>
                    <option value="">Select country</option>
                    {ADZUNA_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs mb-1 block ${ui.sub}`}>City</label>
                  <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. Berlin" className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${ui.input}`} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${ui.sub}`}>Start date</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${ui.input}`} />
                </div>
              </div>
              <div>
                <label className={`text-xs mb-1 block ${ui.sub}`}>About you / what you're looking for</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2}
                  placeholder="e.g. Looking for a roommate in Neukölln, budget €900/mo. Non-smoker, into tech and coffee."
                  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none ${ui.input}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)}
                  className={`flex-1 py-2 rounded-xl border text-sm ${dark ? 'border-[#3a3a3e] text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                  Cancel
                </button>
                <button onClick={handlePost} disabled={!form.name || !form.country || !form.title}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium">
                  Post
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
              <p className="text-green-400 text-sm font-medium">Your move is posted! 🎉</p>
              <p className={`text-xs mt-1 ${ui.sub}`}>Others relocating to the same city can now find and reach out to you.</p>
            </div>
          )}

          {/* Country filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${ui.pill(filter === 'all')}`}>All</button>
            {activeCountries.map(code => {
              const c = countryOf(code);
              return c ? (
                <button key={code} onClick={() => setFilter(code)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${ui.pill(filter === code)}`}>
                  {c.flag} {c.label}
                </button>
              ) : null;
            })}
          </div>

          {/* Posts */}
          <div className="space-y-3">
            {filtered.map(post => {
              const c = countryOf(post.country);
              const liSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${post.title} ${post.company || ''} ${post.city || c?.label || ''}`)}`;
              return (
                <div key={post.id} className={`rounded-xl border p-4 transition-all ${ui.card}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {post.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold ${ui.text}`}>{post.name}</p>
                          <p className={`text-xs ${ui.sub}`}>
                            {post.title}{post.company ? ` at ${post.company}` : ''} · Moving to {post.city ? `${post.city}, ` : ''}{c?.flag} {c?.label}
                            {post.date && ` · ${new Date(post.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                          </p>
                        </div>
                      </div>
                      {post.bio && <p className={`text-xs mt-2 leading-relaxed ${ui.sub}`}>{post.bio}</p>}
                      <div className="flex gap-3 mt-2">
                        <a href={post.linkedin || liSearch} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                          Find on LinkedIn →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
