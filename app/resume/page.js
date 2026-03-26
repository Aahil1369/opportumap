'use client';

import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

function ScoreRing({ score, size = 120 }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const grade_bg = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : score >= 40 ? 'text-orange-400' : 'text-red-400';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <p className={`text-2xl font-black ${grade_bg}`}>{score}</p>
        <p className="text-xs text-zinc-500">/100</p>
      </div>
    </div>
  );
}

function SectionBar({ label, score, dark }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className={`text-xs ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>{label}</span>
        <span className={`text-xs font-bold ${dark ? 'text-zinc-300' : 'text-zinc-700'}`}>{score}</span>
      </div>
      <div className={`h-2 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const PRIORITY_COLORS = {
  high: 'border-red-500/40 bg-red-500/5 text-red-400',
  medium: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
  low: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
};

export default function ResumePage() {
  const { dark, toggleDark } = useTheme();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const ui = {
    bg: dark ? 'bg-[#0e0e10]' : 'bg-[#f5f5f7]',
    card: dark ? 'bg-[#1a1a1d] border-[#2a2a2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    divider: dark ? 'border-[#2a2a2e]' : 'border-zinc-100',
    upload: dark
      ? `border-[#3a3a3e] bg-[#1a1a1d] hover:border-indigo-500/60 ${dragOver ? 'border-indigo-500 bg-indigo-500/5' : ''}`
      : `border-zinc-300 bg-zinc-50 hover:border-indigo-400 ${dragOver ? 'border-indigo-400 bg-indigo-50' : ''}`,
  };

  const analyze = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('resume', file);
      const res = await fetch('/api/resume-grade', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyze(file);
  };

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📄</span>
            <h1 className={`text-2xl font-bold ${ui.text}`}>Resume Analyzer</h1>
          </div>
          <p className={`text-sm ${ui.sub}`}>
            Upload your resume and get an AI-powered grade, specific improvement tips, and a list of jobs you qualify for.
          </p>
        </div>

        {/* Upload zone */}
        {!result && (
          <div
            className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all mb-6 ${ui.upload}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => analyze(e.target.files?.[0])} />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className={`text-sm font-medium ${ui.text}`}>Analyzing your resume with AI...</p>
                <p className={`text-xs ${ui.sub}`}>This takes about 10–15 seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-4xl">{fileName ? '📄' : '📎'}</p>
                <p className={`text-base font-semibold ${ui.text}`}>
                  {fileName || 'Drop your resume here or click to upload'}
                </p>
                <p className={`text-sm ${ui.sub}`}>PDF only · Max 10MB</p>
                {!fileName && (
                  <button className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                    Choose File
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Re-analyze button */}
            <div className="flex items-center justify-between">
              <p className={`text-xs ${ui.sub}`}>Analyzed: <span className="font-medium">{fileName}</span></p>
              <button
                onClick={() => { setResult(null); setFileName(''); }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${dark ? 'border-[#3a3a3e] text-zinc-400 hover:bg-[#2a2a2e]' : 'border-zinc-200 text-zinc-500 hover:bg-white'}`}>
                Analyze another resume
              </button>
            </div>

            {/* Score card */}
            <div className={`rounded-2xl border p-6 ${ui.card}`}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={result.score} size={130} />
                <div className="flex-1 text-center sm:text-left">
                  {result.name && <p className={`text-lg font-bold mb-1 ${ui.text}`}>{result.name}</p>}
                  <div className="flex items-center gap-3 justify-center sm:justify-start mb-3">
                    <span className={`text-3xl font-black ${result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-amber-400' : result.score >= 40 ? 'text-orange-400' : 'text-red-400'}`}>
                      {result.grade}
                    </span>
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      result.score >= 80 ? 'bg-green-500/10 text-green-400' :
                      result.score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                      result.score >= 40 ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {result.score >= 80 ? 'Strong Resume' : result.score >= 60 ? 'Good Resume' : result.score >= 40 ? 'Needs Work' : 'Major Issues'}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${ui.sub}`}>{result.summary}</p>
                </div>
              </div>

              {/* Section scores */}
              {result.sectionScores && (
                <div className={`mt-5 pt-5 border-t ${ui.divider} grid sm:grid-cols-2 gap-3`}>
                  {Object.entries(result.sectionScores).map(([key, val]) => (
                    <SectionBar key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} score={val} dark={dark} />
                  ))}
                </div>
              )}
            </div>

            {/* Two-col layout */}
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Strengths */}
              <div className={`rounded-2xl border p-5 ${ui.card}`}>
                <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${ui.text}`}>
                  <span className="text-green-400">✓</span> What's Working
                </h3>
                <ul className="space-y-2">
                  {result.strengths?.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">●</span>
                      <span className={`text-xs leading-relaxed ${ui.sub}`}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Missing keywords */}
              {result.keywords_missing?.length > 0 && (
                <div className={`rounded-2xl border p-5 ${ui.card}`}>
                  <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${ui.text}`}>
                    <span className="text-amber-400">🔑</span> Missing Keywords
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywords_missing.map((k, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${dark ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-600'}`}>
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className={`text-xs mt-3 ${ui.sub}`}>Add these keywords to improve ATS ranking.</p>
                </div>
              )}
            </div>

            {/* Improvements */}
            <div className={`rounded-2xl border p-5 ${ui.card}`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${ui.text}`}>
                <span className="text-red-400">⚠</span> What to Fix
              </h3>
              <div className="space-y-3">
                {result.improvements?.map((item, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-bold uppercase mt-0.5 px-1.5 py-0.5 rounded ${
                        item.priority === 'high' ? 'bg-red-500/20' : item.priority === 'medium' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                      }`}>{item.priority}</span>
                      <div>
                        <p className="text-xs font-semibold">{item.issue}</p>
                        <p className={`text-xs mt-1 leading-relaxed ${ui.sub}`}>
                          <span className="font-medium">Fix: </span>{item.fix}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Job matches */}
            <div className={`rounded-2xl border p-5 ${ui.card}`}>
              <h3 className={`text-sm font-bold mb-1 flex items-center gap-2 ${ui.text}`}>
                <span className="text-indigo-400">💼</span> Jobs You Qualify For
              </h3>
              <p className={`text-xs mb-4 ${ui.sub}`}>Based on your resume, here are roles you match well for right now:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {result.jobMatches?.map((job, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${dark ? 'border-[#2a2a2e] bg-[#111113]' : 'border-zinc-100 bg-zinc-50'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold ${ui.text}`}>{job.title}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        job.matchScore >= 80 ? 'bg-green-500/10 text-green-400' :
                        job.matchScore >= 60 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>{job.matchScore}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'} mb-1.5`}>
                      <div className={`h-1.5 rounded-full ${job.matchScore >= 80 ? 'bg-green-500' : job.matchScore >= 60 ? 'bg-amber-500' : 'bg-zinc-500'}`}
                        style={{ width: `${job.matchScore}%` }} />
                    </div>
                    <p className={`text-xs ${ui.sub}`}>{job.reason}</p>
                  </div>
                ))}
              </div>
              <div className={`mt-4 pt-4 border-t ${ui.divider} flex gap-3`}>
                <a href="/jobs" className="flex-1 text-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                  Browse Matching Jobs →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
