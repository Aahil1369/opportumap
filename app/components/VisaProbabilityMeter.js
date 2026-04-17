'use client';

export default function VisaProbabilityMeter({ data, isDark }) {
  if (!data) return null;

  const probColors = {
    'Low': { bar: 'bg-red-500', text: 'text-red-400', width: '20%' },
    'Medium': { bar: 'bg-yellow-500', text: 'text-yellow-400', width: '50%' },
    'High': { bar: 'bg-green-500', text: 'text-green-400', width: '75%' },
    'Very High': { bar: 'bg-emerald-400', text: 'text-emerald-400', width: '95%' },
  };

  const colors = probColors[data.probability] || probColors['Medium'];

  return (
    <div className={`rounded-xl border p-6 mb-8 ${
      isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-white border-zinc-200'
    }`}>
      <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        Visa Approval Probability
      </h3>

      <div className="flex items-center gap-4 mb-4">
        <div className={`flex-1 h-4 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <div className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`}
            style={{ width: colors.width }} />
        </div>
        <span className={`text-2xl font-bold ${colors.text}`}>{data.probability}</span>
      </div>

      <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        Estimated range: <span className="font-semibold">{data.percentage_range}</span>
        {data.recommended_visa_type && <> via <span className="font-semibold">{data.recommended_visa_type}</span></>}
        {data.processing_time && <> &middot; Processing: {data.processing_time}</>}
      </p>

      {data.factors && data.factors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Key Factors</h4>
          {data.factors.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5">
                {f.impact === 'positive' ? '✅' : f.impact === 'negative' ? '❌' : '➖'}
              </span>
              <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{f.factor}</span>
            </div>
          ))}
        </div>
      )}

      {data.tip && (
        <div className={`p-3 rounded-lg ${isDark ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
          <p className={`text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
            <span className="font-semibold">Tip:</span> {data.tip}
          </p>
        </div>
      )}
    </div>
  );
}
