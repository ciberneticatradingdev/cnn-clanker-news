'use client';

import { useEffect, useState } from 'react';
import type { NewsItem } from '../api/news/route';

interface BreakingBannerProps {
  story: NewsItem | null;
}

export default function BreakingBanner({ story }: BreakingBannerProps) {
  const [visible, setVisible] = useState(false);
  const [prevStory, setPrevStory] = useState<NewsItem | null>(null);

  useEffect(() => {
    if (story && story.id !== prevStory?.id) {
      setVisible(true);
      setPrevStory(story);
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, [story, prevStory]);

  if (!visible || !story) return null;

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 flex items-stretch overflow-hidden"
      style={{
        animation: 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        height: 52,
      }}
    >
      {/* Breaking label */}
      <div
        className="flex shrink-0 items-center justify-center px-5"
        style={{
          background: 'linear-gradient(135deg, #CC0000 0%, #990000 100%)',
          minWidth: 140,
        }}
      >
        <span className="text-sm font-black tracking-widest text-white uppercase">
          Breaking<br />News
        </span>
      </div>

      {/* Story text */}
      <div
        className="flex flex-1 items-center px-4"
        style={{ background: 'linear-gradient(90deg, #0d1f3c 0%, #0A1628 100%)' }}
      >
        <p className="text-white font-semibold text-sm truncate">
          <span className="mr-3 text-yellow-300 font-black">{story.source.toUpperCase()} —</span>
          {story.title}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="flex shrink-0 items-center px-4 text-white/60 hover:text-white bg-[#0A1628] transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
