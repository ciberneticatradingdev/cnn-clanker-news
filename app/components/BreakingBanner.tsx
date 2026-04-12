'use client';

import { useEffect, useState } from 'react';
import type { NewsItem } from '../types';

interface BreakingBannerProps {
  story: NewsItem | null;
}

export default function BreakingBanner({ story }: BreakingBannerProps) {
  const [visible, setVisible] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);

  useEffect(() => {
    if (!story || story.id === shownId) return;
    setShownId(story.id);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(t);
  }, [story, shownId]);

  if (!visible || !story) return null;

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 flex items-stretch overflow-hidden"
      style={{ animation: 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)', height: 52 }}
    >
      <div
        className="flex shrink-0 items-center justify-center px-5"
        style={{ background: 'linear-gradient(135deg, #CC0000 0%, #990000 100%)', minWidth: 140 }}
      >
        <span className="text-sm font-black tracking-widest text-white uppercase leading-tight">Breaking<br />News</span>
      </div>

      {/* Animated scan line */}
      <div
        className="flex flex-1 items-center px-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #0d1f3c 0%, #0A1628 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(204,0,0,0.08) 50%, transparent 100%)',
            animation: 'header-scan 2s linear infinite',
          }}
        />
        <p className="text-white font-semibold text-sm truncate relative z-10">
          <span className="mr-3 text-yellow-300 font-black">{story.source.toUpperCase()} —</span>
          {story.title}
        </p>
      </div>

      {/* Synchronized badge */}
      <div className="flex shrink-0 items-center px-3 bg-[#CC0000]/20 border-l border-red-800/40">
        <span className="text-[9px] font-black text-red-400 tracking-widest">ALL<br />VIEWERS</span>
      </div>

      <button
        onClick={() => setVisible(false)}
        className="flex shrink-0 items-center px-4 text-white/60 hover:text-white bg-[#0A1628] transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
