'use client';

export default function StoryCard({ story, isDark }) {
  return (
    <div className={`rounded-xl border p-6 ${
      isDark ? 'bg-[#12121e] border-[#2a2a3e]' : 'bg-white border-zinc-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded-full ${
          isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {story.from_country} → {story.current_country}
        </span>
        {story.rating && (
          <span className="text-sm text-yellow-400">
            {'★'.repeat(story.rating)}{'☆'.repeat(5 - story.rating)}
          </span>
        )}
      </div>
      <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {story.story_text}
      </p>
    </div>
  );
}
