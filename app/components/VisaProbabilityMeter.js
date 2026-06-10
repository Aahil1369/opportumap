'use client';

export default function VisaProbabilityMeter({ data }) {
  if (!data) return null;

  const probColors = {
    'Low': { bar: 'bg-[#a33417]', width: '20%' },
    'Medium': { bar: 'bg-[#b5912f]', width: '50%' },
    'High': { bar: 'bg-[#5a7d3f]', width: '75%' },
    'Very High': { bar: 'bg-accent', width: '95%' },
  };

  const colors = probColors[data.probability] || probColors['Medium'];

  return (
    <div className="border border-paper-rule bg-paper-bg-alt p-6">
      <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// VISA APPROVAL PROBABILITY</div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 h-2 bg-paper-rule overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${colors.bar}`} style={{ width: colors.width }} />
        </div>
        <span className="font-display text-[40px] leading-none text-accent">{data.probability}</span>
      </div>

      <p className="text-[13px] text-paper-ink-dim leading-[1.5] mb-4">
        Estimated range: <span className="font-medium text-paper-ink">{data.percentage_range}</span>
        {data.recommended_visa_type && <> via <span className="font-medium text-paper-ink">{data.recommended_visa_type}</span></>}
        {data.processing_time && <> &middot; Processing: {data.processing_time}</>}
      </p>

      {data.factors && data.factors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">KEY FACTORS</h4>
          {data.factors.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5">
                {f.impact === 'positive' ? '✅' : f.impact === 'negative' ? '❌' : '➖'}
              </span>
              <span className="text-[13px] text-paper-ink-dim">{f.factor}</span>
            </div>
          ))}
        </div>
      )}

      {data.tip && (
        <div className="border border-paper-rule bg-paper-bg p-3">
          <p className="text-[13px] text-paper-ink-dim">
            <span className="font-medium text-paper-ink">Tip:</span> {data.tip}
          </p>
        </div>
      )}
    </div>
  );
}
