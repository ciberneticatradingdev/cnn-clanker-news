'use client';

import type { NewsItem } from '../types';

interface NewsGridProps {
  stories: NewsItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  World: '#3a8eff',
  Business: '#00c896',
  Tech: '#a855f7',
  Politics: '#f59e0b',
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsGrid({ stories, currentIndex, onSelect }: NewsGridProps) {
  const displayStories = stories.slice(0, 12);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {displayStories.map((story, i) => {
        const isActive = currentIndex === i;
        const catColor = CATEGORY_COLORS[story.category] || '#3a8eff';

        return (
          <button
            key={story.id}
            onClick={() => onSelect(i)}
            className="text-left rounded border p-3 transition-all duration-200 group"
            style={{
              borderColor: isActive ? catColor : 'rgba(26,58,107,0.5)',
              backgroundColor: isActive ? `${catColor}11` : '#0d1f3c',
              boxShadow: isActive ? `0 0 12px ${catColor}33` : 'none',
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                style={{ backgroundColor: `${catColor}22`, color: catColor, border: `1px solid ${catColor}44` }}
              >
                {story.category}
              </span>
              <span className="text-[9px] text-blue-400/60 font-mono">{story.source}</span>
              <span className="ml-auto text-[9px] text-blue-400/40 font-mono">{timeAgo(story.timestamp)}</span>
            </div>
            <p
              className="text-xs font-semibold leading-snug group-hover:text-white transition-colors line-clamp-2"
              style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
              {story.title}
            </p>
            {isActive && story.summary && (
              <p className="mt-1.5 text-[10px] text-blue-200/50 leading-relaxed line-clamp-2">
                {story.summary}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
