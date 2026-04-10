'use client';

import { useEffect, useRef, useState } from 'react';
import type { NewsItem } from '../api/news/route';

interface TickerProps {
  stories: NewsItem[];
}

export default function Ticker({ stories }: TickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [tickerWidth, setTickerWidth] = useState(0);

  const tickerItems = stories.slice(0, 20);

  useEffect(() => {
    if (trackRef.current) {
      setTickerWidth(trackRef.current.scrollWidth);
    }
  }, [stories]);

  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-9 items-stretch overflow-hidden bg-[#CC0000] shadow-[0_-2px_8px_rgba(0,0,0,0.6)]">
      {/* Left label */}
      <div className="flex shrink-0 items-center bg-[#0A1628] px-3 text-white">
        <span className="text-xs font-black tracking-widest uppercase">Breaking</span>
      </div>
      <div className="flex shrink-0 items-center bg-[#FF0000] px-3">
        <span className="text-xs font-bold text-white tracking-wider">NEWS</span>
      </div>

      {/* Scrolling track */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="ticker-track flex items-center gap-0 whitespace-nowrap"
          style={{
            animation: tickerWidth > 0 ? `ticker-scroll ${tickerWidth / 80}s linear infinite` : undefined,
          }}
        >
          {tickerItems.map((item, i) => (
            <span key={item.id} className="inline-flex items-center px-4 text-white text-sm font-medium">
              <span className="mr-2 text-yellow-300 font-bold text-xs">[{item.source.toUpperCase()}]</span>
              {item.title}
              {i < tickerItems.length - 1 && (
                <span className="mx-6 text-yellow-300 font-bold">◆</span>
              )}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {tickerItems.map((item, i) => (
            <span key={`dup-${item.id}`} className="inline-flex items-center px-4 text-white text-sm font-medium">
              <span className="mr-2 text-yellow-300 font-bold text-xs">[{item.source.toUpperCase()}]</span>
              {item.title}
              {i < tickerItems.length - 1 && (
                <span className="mx-6 text-yellow-300 font-bold">◆</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Right time */}
      <div className="flex shrink-0 items-center bg-[#0A1628] px-3">
        <span className="text-xs font-mono text-white/80">{timeStr}</span>
      </div>
    </div>
  );
}
