'use client';

import { useState, useEffect } from 'react';

export default function Dashboard({ profile, dark }) {
  const isDark = dark;
  const [recentJobs, setRecentJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const countries = profile.preferredCountries || [];
        const country = countries[0] || '';
        const skills = Array.isArray(profile.skills)
          ? profile.skills[0] || ''
          : (profile.skills || '').split(',')[0] || '';
        const jobType = (profile.jobTypes || [])[0] || '';
        const query = skills || jobType;
        const q = query ? `&query=${encodeURIComponent(query.trim())}` : '';
        const res = await fetch(`/api/jobs?country=${encodeURIComponent(country)}${q}&sort=date`);
        const data = await res.json();
        setRecentJobs((data.jobs || []).slice(0, 6));
      } catch {
        setRecentJobs([]);
      } finally {
        setJobsLoading(false);
      }
    }
    loadJobs();
  }, [profile]);

  const firstName = (profile.name || '').split(' ')[0] || 'there';

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-16">
      <div className="mb-10">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Welcome back, {firstName}
        </h1>
        <p className={`text-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Here&apos;s what&apos;s new for you across your target countries.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Country Match', href: '/match', icon: '🌍', desc: 'Find your best fit' },
          { label: 'Visa Intel', href: '/visa', icon: '🛂', desc: 'Check visa paths' },
          { label: 'Resume Grade', href: '/resume', icon: '📄', desc: 'Get feedback' },
          { label: 'Interview Prep', href: '/interview', icon: '🎤', desc: 'Practice now' },
        ].map(item => (
          <a key={item.href} href={item.href}
            className={`p-4 rounded-xl border text-center transition-all hover:scale-[1.02] ${
              isDark
                ? 'bg-[#12121e] border-[#2a2a3e] hover:border-indigo-500/50'
                : 'bg-white border-zinc-200 hover:border-indigo-400'
            }`}>
            <span className="text-2xl">{item.icon}</span>
            <p className={`text-sm font-semibold mt-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.label}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{item.desc}</p>
          </a>
        ))}
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Recent Jobs in Your Target Countries
          </h2>
          <a href="/jobs" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">View all →</a>
        </div>

        {jobsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className={`h-24 rounded-xl animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
            ))}
          </div>
        ) : recentJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentJobs.map((job, i) => (
              <a key={i} href={job.url || job.redirect_url || '#'} target="_blank" rel="noopener noreferrer"
                className={`p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                  isDark
                    ? 'bg-[#12121e] border-[#2a2a3e] hover:border-indigo-500/50'
                    : 'bg-white border-zinc-200 hover:border-indigo-400'
                }`}>
                <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {job.title}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {job.company?.display_name || job.company || 'Company'} · {job.location?.display_name || job.location || ''}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
            No recent jobs found. Try updating your profile with target countries.
          </p>
        )}
      </div>

      {profile.preferredCountries && profile.preferredCountries.length > 0 && (
        <div>
          <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Your Target Countries
          </h2>
          <div className="flex flex-wrap gap-3">
            {profile.preferredCountries.map(c => (
              <a key={c} href="/visa"
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-[#2a2a3e] text-zinc-300 hover:bg-zinc-800 hover:border-indigo-500/50'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-indigo-400'
                }`}>
                {c} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
