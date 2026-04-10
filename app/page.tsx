'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NewsItem } from './api/news/route';
import Ticker from './components/Ticker';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';
import NewsGrid from './components/NewsGrid';
import BreakingBanner from './components/BreakingBanner';

// Dynamically import AI anchor to avoid SSR issues with Web Speech API
const AIAnchor = dynamic(() => import('./components/AIAnchor'), { ssr: false });

function LiveClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="text-right">
      <div className="font-mono text-lg font-black text-white tracking-wider leading-none">{time}</div>
      <div className="text-[10px] text-blue-300/70 mt-0.5">{date}</div>
    </div>
  );
}

export default function CNNPage() {
  const [stories, setStories] = useState<NewsItem[]>([]);
  const [sourceCount, setSourceCount] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [breakingStory, setBreakingStory] = useState<NewsItem | null>(null);
  const [activeTab, setActiveTab] = useState<'anchor' | 'grid'>('anchor');

  // Fetch news
  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        setStories(data.stories || []);
        setSourceCount(data.sources || 5);
        if (data.stories?.length > 0) {
          setBreakingStory(data.stories[0]);
        }
      } catch {
        console.error('Failed to fetch news');
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // Auto-cycle stories
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = (prev + 1) % Math.max(stories.length, 1);
      // Trigger breaking banner every 5 stories
      if (next % 5 === 0 && stories[next]) {
        setBreakingStory(stories[next]);
      }
      return next;
    });
  }, [stories]);

  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return (
    <div className="min-h-screen pb-9" style={{ background: 'linear-gradient(180deg, #080e1a 0%, #0A1628 100%)' }}>
      <BreakingBanner story={breakingStory} />

      {/* Header */}
      <header
        className="sticky top-0 z-30 w-full border-b overflow-hidden"
        style={{
          borderBottomColor: 'rgba(58, 142, 255, 0.2)',
          background: 'linear-gradient(180deg, #04080f 0%, #0A1628 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Scanning light effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(58,142,255,0.04) 50%, transparent 100%)',
            animation: 'header-scan 4s linear infinite',
          }}
        />

        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* AI Robot Icon */}
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border"
              style={{
                borderColor: 'rgba(58,142,255,0.4)',
                background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)',
                boxShadow: '0 0 16px rgba(58,142,255,0.2)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="7" width="16" height="12" rx="3" fill="#1a3a6b" stroke="#3a8eff" strokeWidth="1.2"/>
                <circle cx="9" cy="12" r="2" fill="#3a8eff"/>
                <circle cx="15" cy="12" r="2" fill="#3a8eff"/>
                <rect x="10" y="15" width="4" height="1.5" rx="0.75" fill="#3a8eff" opacity="0.7"/>
                <rect x="11" y="4" width="2" height="4" rx="1" fill="#3a8eff"/>
                <circle cx="12" cy="3.5" r="1.5" fill="#3a8eff"/>
                <line x1="4" y1="12" x2="2" y2="12" stroke="#3a8eff" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="20" y1="12" x2="22" y2="12" stroke="#3a8eff" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black tracking-tight text-white leading-none">
                  CLANKER
                </span>
                <span className="text-xl font-black tracking-tight leading-none" style={{ color: '#CC0000' }}>
                  NEWS
                </span>
                <span className="text-xl font-black tracking-tight text-white leading-none">
                  NETWORK
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-black text-white tracking-widest"
                  style={{ backgroundColor: '#3a8eff', letterSpacing: '0.12em' }}
                >
                  $CNN
                </span>
                <span className="text-[9px] text-blue-300/50 tracking-wider">
                  AI-POWERED · BLOCKCHAIN NEWS
                </span>
              </div>
            </div>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1">
            {['WORLD', 'BUSINESS', 'TECH', 'POLITICS'].map(tab => (
              <button
                key={tab}
                className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-white/60 hover:text-white transition-colors rounded hover:bg-white/5"
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* LIVE badge */}
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: '#CC0000',
                  animation: 'live-pulse 1.5s ease-in-out infinite',
                }}
              />
              <span className="text-xs font-black text-white tracking-widest">LIVE</span>
            </div>

            <LiveClock />
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="h-0.5 w-full"
          style={{ background: 'linear-gradient(90deg, transparent, #CC0000 20%, #3a8eff 50%, #CC0000 80%, transparent)' }}
        />
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div
              className="h-12 w-12 rounded-full border-2 border-blue-600 border-t-transparent"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <div className="text-blue-400 font-mono text-sm tracking-wider">
              CONNECTING TO NEWS FEEDS...
            </div>
            <div className="flex gap-1">
              {[0,1,2,3,4].map(i => (
                <div
                  key={i}
                  className="h-1 w-8 rounded-full bg-blue-800"
                  style={{
                    animation: `wave-bar 0.6s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                    maxHeight: '100%',
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Stats bar */}
            <StatsPanel storyCount={stories.length} sourceCount={sourceCount} />

            {/* Main layout: sidebar | center | info */}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-4">

              {/* Left Sidebar */}
              <div className="hidden lg:block">
                <Sidebar
                  stories={stories}
                  currentIndex={currentIndex}
                  onSelect={handleSelect}
                />
              </div>

              {/* Center panel */}
              <div className="flex flex-col gap-4">
                {/* Main broadcast panel */}
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{
                    borderColor: 'rgba(58, 142, 255, 0.25)',
                    background: 'linear-gradient(180deg, #0d1f3c 0%, #0A1628 100%)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(58,142,255,0.05)',
                    animation: 'border-glow 3s ease-in-out infinite',
                  }}
                >
                  {/* Panel header */}
                  <div
                    className="flex items-center justify-between px-4 py-2 border-b"
                    style={{ borderBottomColor: 'rgba(58,142,255,0.15)', background: 'rgba(0,0,0,0.3)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: '#CC0000', animation: 'live-pulse 1.2s ease-in-out infinite' }}
                      />
                      <span className="text-[10px] font-black tracking-widest text-white">AI ANCHOR — LIVE BROADCAST</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('anchor')}
                        className="text-[10px] font-bold tracking-wider px-2 py-1 rounded transition-colors"
                        style={{
                          color: activeTab === 'anchor' ? '#3a8eff' : 'rgba(255,255,255,0.4)',
                          backgroundColor: activeTab === 'anchor' ? 'rgba(58,142,255,0.1)' : 'transparent',
                        }}
                      >
                        ANCHOR
                      </button>
                      <button
                        onClick={() => setActiveTab('grid')}
                        className="text-[10px] font-bold tracking-wider px-2 py-1 rounded transition-colors"
                        style={{
                          color: activeTab === 'grid' ? '#3a8eff' : 'rgba(255,255,255,0.4)',
                          backgroundColor: activeTab === 'grid' ? 'rgba(58,142,255,0.1)' : 'transparent',
                        }}
                      >
                        ALL STORIES
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    {activeTab === 'anchor' ? (
                      <AIAnchor
                        stories={stories}
                        currentIndex={currentIndex}
                        onNext={handleNext}
                      />
                    ) : (
                      <NewsGrid
                        stories={stories}
                        currentIndex={currentIndex}
                        onSelect={handleSelect}
                      />
                    )}
                  </div>
                </div>

                {/* Feature story strip (bottom 3 stories in a row) */}
                {stories.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {stories.slice(currentIndex > 0 ? currentIndex - 1 : 0, (currentIndex > 0 ? currentIndex - 1 : 0) + 3).map((story, i) => (
                      <div
                        key={story.id}
                        className="rounded border p-3 cursor-pointer hover:border-blue-600/50 transition-all"
                        style={{
                          borderColor: 'rgba(26,58,107,0.5)',
                          background: '#0d1f3c',
                        }}
                        onClick={() => handleSelect(stories.indexOf(story))}
                      >
                        <div
                          className="mb-1 text-[9px] font-black uppercase tracking-wider"
                          style={{ color: i === 1 ? '#CC0000' : '#3a8eff' }}
                        >
                          {story.category} · {story.source}
                        </div>
                        <p className="text-white/80 text-xs leading-snug line-clamp-2">{story.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right panel — additional context */}
              <div className="hidden lg:flex flex-col gap-4">
                {/* About CNN */}
                <div
                  className="rounded-lg border p-4"
                  style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}
                >
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">
                    About $CNN
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Clanker News Network is an AI-powered news broadcasting platform built on the blockchain. Our AI anchor monitors global news 24/7.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-300/60">Token</span>
                      <span className="font-black text-white font-mono">$CNN</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-300/60">Network</span>
                      <span className="font-black text-green-400">BASE</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-300/60">Creator</span>
                      <span className="font-black text-blue-300">Clanker</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-blue-300/60">Status</span>
                      <span className="font-black text-green-400 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" style={{ animation: 'status-pulse 1s ease-in-out infinite alternate' }} />
                        LIVE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feed signal strength */}
                <div
                  className="rounded-lg border p-4"
                  style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}
                >
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">
                    Signal Quality
                  </h3>
                  {[
                    { name: 'BBC', quality: 98, color: '#CC0000' },
                    { name: 'Reuters', quality: 95, color: '#FF6600' },
                    { name: 'NY Times', quality: 91, color: '#3a8eff' },
                    { name: 'Al Jazeera', quality: 87, color: '#00c896' },
                    { name: 'Google News', quality: 99, color: '#a855f7' },
                  ].map(src => (
                    <div key={src.name} className="mb-2">
                      <div className="flex justify-between text-[9px] mb-1">
                        <span className="text-white/60">{src.name}</span>
                        <span className="font-mono text-white/60">{src.quality}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-blue-900/40 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${src.quality}%`, backgroundColor: src.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent stories quick list */}
                <div
                  className="rounded-lg border p-4 flex-1"
                  style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}
                >
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">
                    Latest Updates
                  </h3>
                  <div className="flex flex-col gap-2">
                    {stories.slice(0, 6).map((story, i) => (
                      <button
                        key={story.id}
                        onClick={() => handleSelect(i)}
                        className="text-left group"
                      >
                        <p className="text-white/65 text-[10px] leading-snug group-hover:text-white transition-colors line-clamp-2">
                          {story.title}
                        </p>
                        <span className="text-[8px] text-blue-500/60 font-mono">{story.source}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom ticker */}
      <Ticker stories={stories} />
    </div>
  );
}
