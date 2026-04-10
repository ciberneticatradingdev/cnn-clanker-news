'use client';

import type { NewsItem } from '../api/broadcast/route';

interface SidebarProps {
  stories: NewsItem[];
  currentIndex: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  World: '#3a8eff',
  Business: '#00c896',
  Tech: '#a855f7',
  Politics: '#f59e0b',
};

const SOURCES = [
  { name: 'BBC NEWS', color: '#CC0000' },
  { name: 'REUTERS', color: '#FF6600' },
  { name: 'NY TIMES', color: '#666' },
  { name: 'AL JAZEERA', color: '#00873d' },
  { name: 'GOOGLE NEWS', color: '#4285f4' },
];

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Sidebar is read-only — the broadcast director controls which story is active
export default function Sidebar({ stories, currentIndex }: SidebarProps) {
  const topStories = stories.slice(0, 8);
  const trending = stories.slice(8, 14);
  const categories = Array.from(new Set(stories.map(s => s.category)));

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Sources */}
      <div className="rounded border border-blue-800/40 bg-[#0d1f3c] p-3">
        <h3 className="mb-3 text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2">Live Sources</h3>
        <div className="flex flex-col gap-1.5">
          {SOURCES.map(src => (
            <div key={src.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: '#00ff88', boxShadow: '0 0 4px #00ff88', animation: 'status-pulse 1.5s ease-in-out infinite alternate' }}
                />
                <span className="text-[11px] font-bold text-white/80">{src.name}</span>
              </div>
              <span className="rounded bg-[#CC0000] px-1.5 py-0.5 text-[9px] font-black text-white">LIVE</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage */}
      <div className="rounded border border-blue-800/40 bg-[#0d1f3c] p-3">
        <h3 className="mb-2 text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2">Coverage</h3>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <span
              key={cat}
              className="rounded px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: `${CATEGORY_COLORS[cat] || '#3a8eff'}22`,
                color: CATEGORY_COLORS[cat] || '#3a8eff',
                border: `1px solid ${CATEGORY_COLORS[cat] || '#3a8eff'}44`,
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Top Stories — server-driven current index highlighted */}
      <div className="rounded border border-blue-800/40 bg-[#0d1f3c] p-3">
        <h3 className="mb-3 text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2">Top Stories</h3>
        <div className="flex flex-col gap-2">
          {topStories.map((story, i) => {
            const isActive = currentIndex === i;
            return (
              <div
                key={story.id}
                className="text-left w-full rounded p-2 transition-colors"
                style={{
                  backgroundColor: isActive ? 'rgba(58,142,255,0.1)' : 'transparent',
                  borderLeft: isActive ? '2px solid #3a8eff' : '2px solid transparent',
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-[10px] font-black"
                    style={{ color: isActive ? '#3a8eff' : (CATEGORY_COLORS[story.category] || '#3a8eff') }}
                  >
                    {isActive ? '▶' : String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs leading-tight line-clamp-2"
                      style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.75)' }}
                    >
                      {story.isBreaking && <span className="text-red-400 font-black mr-1 text-[9px]">BREAKING</span>}
                      {story.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold" style={{ color: CATEGORY_COLORS[story.category] || '#3a8eff' }}>
                        {story.category}
                      </span>
                      <span className="text-blue-600 text-[9px]">•</span>
                      <span className="text-blue-400/60 text-[9px] font-mono">{timeAgo(story.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending */}
      <div className="rounded border border-blue-800/40 bg-[#0d1f3c] p-3">
        <h3 className="mb-3 text-[10px] font-black tracking-widest text-orange-400 uppercase border-b border-orange-800/40 pb-2">Trending</h3>
        <div className="flex flex-col gap-2">
          {trending.map(story => (
            <div key={story.id} className="text-left">
              <p className="text-white/70 text-xs leading-snug line-clamp-2">{story.title}</p>
              <span className="text-[9px] text-orange-400/70 font-mono">{story.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
