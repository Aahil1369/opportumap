'use client';

export default function CountryMatchCard({ match, isDark }) {
  const difficultyColor = {
    'Easy': 'text-green-400 bg-green-400/10 border-green-400/30',
    'Moderate': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    'Hard': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    'Very Hard': 'text-red-400 bg-red-400/10 border-red-400/30',
  }[match.visa_difficulty] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';

  const jobColor = {
    'High': 'text-green-400',
    'Medium': 'text-yellow-400',
    'Low': 'text-red-400',
  }[match.job_availability] || 'text-zinc-400';

  return (
    <div className={`rounded-xl border p-6 transition-all hover:scale-[1.01] ${
      isDark
        ? 'bg-[#12121e] border-[#2a2a3e] hover:border-indigo-500/50'
        : 'bg-white border-zinc-200 hover:border-indigo-400'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {match.country_name}
          </h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {match.top_reason}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-4 shrink-0">
          <span className="text-3xl font-bold text-indigo-400">{match.match_score}</span>
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Visa</span>
          <p className={`text-sm font-medium px-2 py-0.5 rounded-full border inline-block mt-1 ${difficultyColor}`}>
            {match.visa_difficulty}
          </p>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Jobs</span>
          <p className={`text-sm font-semibold mt-1 ${jobColor}`}>{match.job_availability}</p>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Cost</span>
          <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{match.cost_of_living}</p>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Language</span>
          <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{match.language_barrier}</p>
        </div>
      </div>

      <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        <span className="font-medium">Visa path:</span> {match.visa_path}
      </p>

      <div className="flex gap-3">
        <a href={`/visa`}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          Visa Details
        </a>
        <a href={`/relocate`}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark
              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}>
          Relocation Guide
        </a>
        <a href={`/jobs`}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            isDark
              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
          }`}>
          View Jobs
        </a>
      </div>
    </div>
  );
}
