'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';

const CATEGORY_COLORS = {
  behavioral: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  technical: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  culture: 'text-green-400 bg-green-500/10 border-green-500/20',
};

function ScoreBadge({ score }) {
  const color = score >= 7 ? 'text-green-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-2xl font-black ${color}`}>{score}<span className="text-sm font-normal opacity-50">/10</span></span>;
}

export default function InterviewPage() {
  const { dark, toggleDark } = useTheme();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('bank');
  const [expandedQ, setExpandedQ] = useState(null);

  const [mockIndex, setMockIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [feedbacks, setFeedbacks] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [mockDone, setMockDone] = useState(false);

  const ui = {
    bg: dark ? 'bg-[#080810]' : 'bg-[#f8f8fc]',
    card: dark ? 'bg-[#0e0e18] border-[#1e1e2e]' : 'bg-white border-zinc-200',
    text: dark ? 'text-zinc-100' : 'text-zinc-900',
    sub: dark ? 'text-zinc-400' : 'text-zinc-500',
    input: dark ? 'bg-[#12121e] border-[#2a2a3e] text-zinc-100 placeholder-zinc-600' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400',
    divider: dark ? 'border-[#1e1e2e]' : 'border-zinc-100',
    tab: (a) => a ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold' : `${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`,
  };

  const generateQuestions = async () => {
    if (!jobTitle.trim() || !company.trim()) { setError('Job title and company name are required.'); return; }
    setLoading(true);
    setError('');
    setQuestions([]);
    setFeedbacks({});
    setMockIndex(0);
    setMockDone(false);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, company, jobDescription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions || []);
    } catch (e) {
      setError(e.message || 'Failed to generate questions.');
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    const q = questions[mockIndex];
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, answer: currentAnswer, jobTitle, category: q.category }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFeedbacks((prev) => ({ ...prev, [mockIndex]: data }));
    } catch (e) {
      setError(e.message);
    }
    setFeedbackLoading(false);
  };

  const nextQuestion = () => {
    setCurrentAnswer('');
    if (mockIndex + 1 >= questions.length) {
      setMockDone(true);
    } else {
      setMockIndex(mockIndex + 1);
    }
  };

  const avgScore = Object.values(feedbacks).length > 0
    ? Math.round(Object.values(feedbacks).reduce((s, f) => s + f.score, 0) / Object.values(feedbacks).length * 10) / 10
    : null;

  return (
    <div className={`min-h-screen ${ui.bg} transition-colors duration-300`}>
      <Navbar dark={dark} onToggleDark={toggleDark} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30">🎤</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-0.5">AI Tool</p>
              <h1 className="text-3xl font-black gradient-text">Interview Prep</h1>
            </div>
          </div>
          <p className={`text-sm max-w-lg ${ui.sub}`}>
            Get a tailored question bank for any role, then practice with AI-graded mock interviews.
          </p>
        </div>

        <div className={`rounded-2xl border p-6 mb-6 ${ui.card}`}>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Job Title *</label>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
            <div>
              <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Company *</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${ui.input}`} />
            </div>
          </div>
          <div className="mb-4">
            <label className={`text-xs font-medium block mb-1.5 ${ui.sub}`}>Job Description (optional — makes questions more specific)</label>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={4}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none ${ui.input}`} />
          </div>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button onClick={generateQuestions} disabled={loading || !jobTitle.trim() || !company.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating questions...
              </span>
            ) : 'Generate Interview Questions'}
          </button>
        </div>

        {questions.length > 0 && (
          <div>
            <div className={`flex gap-6 border-b mb-6 ${ui.divider}`}>
              {['bank', 'mock'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm transition-all ${ui.tab(activeTab === tab)}`}>
                  {tab === 'bank' ? '📚 Question Bank' : '🎤 Mock Interview'}
                </button>
              ))}
            </div>

            {activeTab === 'bank' && (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.id} className={`rounded-2xl border ${ui.card}`}>
                    <button className="w-full p-4 text-left" onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
                      <div className="flex items-start gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 capitalize ${CATEGORY_COLORS[q.category] || CATEGORY_COLORS.behavioral}`}>
                          {q.category}
                        </span>
                        <p className={`text-sm font-medium flex-1 text-left ${ui.text}`}>{q.question}</p>
                        <span className={`text-xs ${ui.sub} flex-shrink-0`}>{expandedQ === i ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {expandedQ === i && (
                      <div className={`px-4 pb-4 border-t ${ui.divider} pt-3 space-y-3`}>
                        {q.why && (
                          <div>
                            <p className="text-xs font-semibold mb-1 text-amber-400">What they&apos;re assessing</p>
                            <p className={`text-xs ${ui.sub}`}>{q.why}</p>
                          </div>
                        )}
                        {q.howToAnswer && (
                          <div>
                            <p className="text-xs font-semibold mb-1 text-indigo-400">How to answer</p>
                            <p className={`text-xs ${ui.sub}`}>{q.howToAnswer}</p>
                          </div>
                        )}
                        {q.exampleAnswer && (
                          <div>
                            <p className="text-xs font-semibold mb-1 text-green-400">Example strong answer</p>
                            <p className={`text-xs ${ui.sub} whitespace-pre-line`}>{q.exampleAnswer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'mock' && !mockDone && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={ui.sub}>Question {mockIndex + 1} of {questions.length}</span>
                    <span className={ui.sub}>{Object.keys(feedbacks).length} answered</span>
                  </div>
                  <div className={`h-2 rounded-full ${dark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <div className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${(mockIndex / questions.length) * 100}%` }} />
                  </div>
                </div>

                <div className={`rounded-2xl border p-6 ${ui.card}`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize inline-block mb-3 ${CATEGORY_COLORS[questions[mockIndex]?.category] || CATEGORY_COLORS.behavioral}`}>
                    {questions[mockIndex]?.category}
                  </span>
                  <p className={`text-base font-semibold mb-5 ${ui.text}`}>{questions[mockIndex]?.question}</p>

                  {!feedbacks[mockIndex] ? (
                    <>
                      <textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Type your answer here — write it as you'd actually say it in an interview..."
                        rows={6}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none mb-4 ${ui.input}`}
                      />
                      <button onClick={submitAnswer} disabled={feedbackLoading || !currentAnswer.trim()}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-all">
                        {feedbackLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Evaluating...
                          </span>
                        ) : 'Submit Answer for Feedback'}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className={`flex items-center justify-between p-4 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                        <div>
                          <p className={`text-xs font-semibold mb-0.5 ${ui.sub}`}>Your Score</p>
                          <ScoreBadge score={feedbacks[mockIndex].score} />
                        </div>
                        <p className={`text-xs max-w-xs text-right ${ui.sub}`}>{feedbacks[mockIndex].verdict}</p>
                      </div>

                      {feedbacks[mockIndex].whatWorked?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-400 mb-1.5">What worked</p>
                          {feedbacks[mockIndex].whatWorked.map((w, i) => (
                            <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-green-400">✓</span>{w}</p>
                          ))}
                        </div>
                      )}

                      {feedbacks[mockIndex].whatToImprove?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-400 mb-1.5">What to improve</p>
                          {feedbacks[mockIndex].whatToImprove.map((w, i) => (
                            <p key={i} className={`text-xs flex gap-1.5 mb-1 ${ui.sub}`}><span className="text-amber-400">→</span>{w}</p>
                          ))}
                        </div>
                      )}

                      {feedbacks[mockIndex].strongerVersion && (
                        <div className={`p-4 rounded-xl ${dark ? 'bg-indigo-500/5 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'}`}>
                          <p className="text-xs font-semibold text-indigo-400 mb-2">Stronger version of your answer</p>
                          <p className={`text-xs leading-relaxed ${ui.sub}`}>{feedbacks[mockIndex].strongerVersion}</p>
                        </div>
                      )}

                      <button onClick={nextQuestion}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                        {mockIndex + 1 >= questions.length ? 'See Final Results' : 'Next Question →'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'mock' && mockDone && (
              <div className={`rounded-2xl border p-8 text-center ${ui.card}`}>
                <p className="text-4xl mb-4">🎉</p>
                <h2 className={`text-xl font-black mb-2 ${ui.text}`}>Mock Interview Complete</h2>
                {avgScore !== null && (
                  <p className={`text-sm mb-6 ${ui.sub}`}>
                    You answered {Object.keys(feedbacks).length} of {questions.length} questions.
                    Average score: <span className={`font-bold ${avgScore >= 7 ? 'text-green-400' : avgScore >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{avgScore}/10</span>
                  </p>
                )}
                <div className="space-y-3 text-left max-w-lg mx-auto mb-6">
                  {Object.entries(feedbacks).map(([idx, fb]) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${dark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
                      <p className={`text-xs flex-1 mr-3 ${ui.sub}`}>{questions[parseInt(idx)]?.question?.slice(0, 60)}...</p>
                      <ScoreBadge score={fb.score} />
                    </div>
                  ))}
                </div>
                <button onClick={() => { setMockIndex(0); setFeedbacks({}); setMockDone(false); setCurrentAnswer(''); }}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                  Practice Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
