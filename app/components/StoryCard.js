'use client';

export default function StoryCard({ story }) {
  return (
    <div className="group border border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors p-7">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub">
          {story.from_country} <span className="text-accent">→</span> {story.current_country}
        </div>
        {story.rating && (
          <span className="font-mono text-[11px] text-accent tracking-[0.1em]">
            {'★'.repeat(story.rating)}{'☆'.repeat(5 - story.rating)}
          </span>
        )}
      </div>
      <p className="font-display text-[19px] leading-[1.45] text-paper-ink">
        {story.story_text}
      </p>
    </div>
  );
}
