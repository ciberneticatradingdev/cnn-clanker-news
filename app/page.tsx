'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NewsItem } from './api/broadcast/route';
import Ticker from './components/Ticker';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';
import NewsGrid from './components/NewsGrid';
import BreakingBanner from './components/BreakingBanner';

const AIAnchor = dynamic(() => import('./components/AIAnchor'), { ssr: false });

// ─── Broadcast state received from SSE ───────────────────────────────────────

interface BroadcastSnapshot {
  story: NewsItem | null;
  currentIndex: number;
  startedAt: number;
  totalStories: number;
  stories: NewsItem[];
  viewerCount: number;
  totalAnalyzed: number;
  storyCount: number;
  sourceCount: number;
  serverStartedAt: number;
  analysis: string | null;
  audioId: string | null;
}

const DEFAULT_SNAPSHOT: BroadcastSnapshot = {
  story: null,
  currentIndex: 0,
  startedAt: 0,
  totalStories: 0,
  stories: [],
  viewerCount: 0,
  totalAnalyzed: 0,
  storyCount: 0,
  sourceCount: 5,
  serverStartedAt: 0,
  analysis: null,
  audioId: null,
};

// ─── Live Clock ───────────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CNNPage() {
  const [snap, setSnap] = useState<BroadcastSnapshot>(DEFAULT_SNAPSHOT);
  const [tickerStories, setTickerStories] = useState<NewsItem[]>([]);
  const [breakingStory, setBreakingStory] = useState<NewsItem | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'anchor' | 'grid'>('anchor');
  const [tuned, setTuned] = useState(false); // user clicked to enable audio
  const [isThinking, setIsThinking] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Connect to SSE broadcast
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource('/api/broadcast');
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(e.data); } catch { return; }

        switch (msg.type) {
          case 'state': {
            const s = msg as unknown as BroadcastSnapshot & { type: string; broadcastStartedAt?: number };
            setSnap({
              story: s.story,
              currentIndex: s.currentIndex,
              startedAt: s.startedAt,
              totalStories: s.totalStories,
              stories: s.stories ?? [],
              viewerCount: s.viewerCount,
              totalAnalyzed: s.totalAnalyzed,
              storyCount: s.storyCount,
              sourceCount: s.sourceCount,
              serverStartedAt: s.broadcastStartedAt ?? s.startedAt,
              analysis: s.analysis ?? null,
              audioId: s.audioId ?? null,
            });
            setTickerStories((s.stories ?? []).slice(0, 20));
            break;
          }
          case 'thinking': {
            setIsThinking(true);
            break;
          }
          case 'story-change': {
            const sc = msg as { story: NewsItem; currentIndex: number; startedAt: number; totalStories: number; storyCount: number; analysis?: string; audioId?: string };
            setIsThinking(false);
            setSnap(prev => ({
              ...prev,
              story: sc.story,
              currentIndex: sc.currentIndex,
              startedAt: sc.startedAt,
              totalStories: sc.totalStories,
              storyCount: sc.storyCount,
              analysis: sc.analysis ?? null,
              audioId: sc.audioId ?? null,
            }));
            break;
          }
          case 'breaking': {
            const br = msg as { story: NewsItem };
            setBreakingStory(br.story);
            break;
          }
          case 'viewer-count': {
            const vc = msg as { count: number };
            setSnap(prev => ({ ...prev, viewerCount: vc.count }));
            break;
          }
          case 'ticker': {
            const tk = msg as { stories: NewsItem[] };
            setTickerStories(tk.stories ?? []);
            setSnap(prev => ({ ...prev, stories: tk.stories ?? prev.stories }));
            break;
          }
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      esRef.current?.close();
    };
  }, []);

  const loading = !connected && snap.stories.length === 0;

  // Tune-in overlay — required for browser audio autoplay policy
  if (!tuned) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center cursor-pointer select-none"
        style={{ background: 'linear-gradient(180deg, #020610 0%, #0A1628 50%, #020610 100%)' }}
        onClick={() => setTuned(true)}
      >
        {/* Scanlines */}
        <div className="fixed inset-0 pointer-events-none z-50" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)', mixBlendMode: 'multiply' }} />

        {/* Glow */}
        <div className="absolute rounded-full" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(58,142,255,0.15) 0%, transparent 70%)', animation: 'pulse-glow 2s ease-in-out infinite alternate' }} />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#CC0000', animation: 'live-pulse 1.5s ease-in-out infinite' }} />
            <span className="text-xs font-black text-white tracking-[0.3em]">LIVE BROADCAST</span>
          </div>

          <div className="text-center">
            <div className="text-5xl font-black tracking-tight text-white leading-none">CLANKER</div>
            <div className="text-5xl font-black tracking-tight leading-none" style={{ color: '#CC0000' }}>NEWS</div>
            <div className="text-5xl font-black tracking-tight text-white leading-none">NETWORK</div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="rounded px-2 py-1 text-xs font-black text-white tracking-[0.15em]" style={{ backgroundColor: '#3a8eff' }}>$CNN</span>
            <span className="text-xs text-blue-300/50 tracking-wider">AI-POWERED NEWS</span>
          </div>

          {/* Tune in button */}
          <div
            className="mt-8 rounded-lg border-2 px-10 py-4 text-center transition-all hover:scale-105"
            style={{
              borderColor: '#CC0000',
              background: 'rgba(204,0,0,0.1)',
              boxShadow: '0 0 30px rgba(204,0,0,0.3), 0 0 60px rgba(204,0,0,0.1)',
              animation: 'border-glow 2s ease-in-out infinite',
            }}
          >
            <div className="text-xl font-black text-white tracking-[0.2em]">▶ TUNE IN</div>
            <div className="text-[10px] text-red-300/60 mt-1 tracking-wider">CLICK TO START LIVE BROADCAST</div>
          </div>

          <div className="mt-4 text-[10px] text-blue-400/40 tracking-wider">Audio required for full experience</div>
        </div>
      </div>
    );
  }

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
                <span className="text-xl font-black tracking-tight text-white leading-none">CLANKER</span>
                <span className="text-xl font-black tracking-tight leading-none" style={{ color: '#CC0000' }}>NEWS</span>
                <span className="text-xl font-black tracking-tight text-white leading-none">NETWORK</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="rounded px-1.5 py-0.5 text-[9px] font-black text-white tracking-widest" style={{ backgroundColor: '#3a8eff', letterSpacing: '0.12em' }}>$CNN</span>
                <span className="text-[9px] text-blue-300/50 tracking-wider">AI-POWERED · BLOCKCHAIN NEWS</span>
              </div>
            </div>
          </div>

          {/* Center — viewer count */}
          <div className="hidden md:flex items-center gap-6">
            {snap.viewerCount > 0 && (
              <div className="flex items-center gap-2 rounded border border-blue-700/30 bg-[#0d1f3c]/60 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400" style={{ animation: 'status-pulse 1s ease-in-out infinite alternate' }} />
                <span className="text-[11px] font-bold text-green-400 font-mono">{snap.viewerCount} viewer{snap.viewerCount !== 1 ? 's' : ''} watching</span>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: connected ? '#CC0000' : '#666', animation: connected ? 'live-pulse 1.5s ease-in-out infinite' : undefined }}
              />
              <span className="text-xs font-black text-white tracking-widest">{connected ? 'LIVE' : 'CONNECTING...'}</span>
            </div>
            <LiveClock />
          </div>
        </div>

        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #CC0000 20%, #3a8eff 50%, #CC0000 80%, transparent)' }} />
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-blue-600 border-t-transparent" style={{ animation: 'spin 1s linear infinite' }} />
            <div className="text-blue-400 font-mono text-sm tracking-wider">CONNECTING TO BROADCAST...</div>
            <div className="flex gap-1">
              {[0,1,2,3,4].map(i => (
                <div
                  key={i}
                  className="h-1 w-8 rounded-full bg-blue-800"
                  style={{ animation: 'wave-bar 0.6s ease-in-out infinite alternate', animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <StatsPanel
              storyCount={snap.totalAnalyzed}
              sourceCount={snap.sourceCount}
              viewerCount={snap.viewerCount}
              serverStartedAt={snap.serverStartedAt}
              totalAnalyzed={snap.totalAnalyzed}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-4">
              {/* Left Sidebar */}
              <div className="hidden lg:block">
                <Sidebar
                  stories={snap.stories}
                  currentIndex={snap.currentIndex}
                />
              </div>

              {/* Center panel */}
              <div className="flex flex-col gap-4">
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{
                    borderColor: 'rgba(58, 142, 255, 0.25)',
                    background: 'linear-gradient(180deg, #0d1f3c 0%, #0A1628 100%)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(58,142,255,0.05)',
                    animation: 'border-glow 3s ease-in-out infinite',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-2 border-b"
                    style={{ borderBottomColor: 'rgba(58,142,255,0.15)', background: 'rgba(0,0,0,0.3)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#CC0000', animation: 'live-pulse 1.2s ease-in-out infinite' }} />
                      <span className="text-[10px] font-black tracking-widest text-white">AI ANCHOR — SYNCHRONIZED BROADCAST</span>
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
                        story={snap.story}
                        currentIndex={snap.currentIndex}
                        startedAt={snap.startedAt}
                        storyCount={snap.storyCount}
                        totalStories={snap.totalStories}
                        analysis={snap.analysis}
                        audioId={snap.audioId}
                        isThinking={isThinking}
                      />
                    ) : (
                      <NewsGrid
                        stories={snap.stories}
                        currentIndex={snap.currentIndex}
                        onSelect={() => {}}
                      />
                    )}
                  </div>
                </div>

                {/* Feature story strip */}
                {snap.stories.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {snap.stories.slice(snap.currentIndex, snap.currentIndex + 3).map((story, i) => (
                      <div
                        key={story.id}
                        className="rounded border p-3"
                        style={{
                          borderColor: i === 0 ? 'rgba(58,142,255,0.4)' : 'rgba(26,58,107,0.5)',
                          background: i === 0 ? 'rgba(58,142,255,0.05)' : '#0d1f3c',
                        }}
                      >
                        <div className="mb-1 text-[9px] font-black uppercase tracking-wider" style={{ color: i === 0 ? '#CC0000' : '#3a8eff' }}>
                          {i === 0 ? '▶ ON AIR NOW' : story.category} · {story.source}
                        </div>
                        <p className="text-white/80 text-xs leading-snug line-clamp-2">{story.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}>
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">About $CNN</h3>
                  <p className="text-xs text-white/60 leading-relaxed">Clanker News Network is an AI-powered news broadcasting platform built on the blockchain. Our AI anchor monitors global news 24/7.</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {[
                      { label: 'Token', value: '$CNN', color: 'text-white' },
                      { label: 'Network', value: 'BASE', color: 'text-green-400' },
                      { label: 'Creator', value: 'Clanker', color: 'text-blue-300' },
                      { label: 'Viewers', value: `${snap.viewerCount} live`, color: 'text-green-400' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between text-[10px]">
                        <span className="text-blue-300/60">{row.label}</span>
                        <span className={`font-black font-mono ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}>
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">Signal Quality</h3>
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
                        <div className="h-full rounded-full" style={{ width: `${src.quality}%`, backgroundColor: src.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border p-4 flex-1" style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}>
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">Latest Updates</h3>
                  <div className="flex flex-col gap-2">
                    {snap.stories.slice(0, 6).map((story, i) => (
                      <div key={story.id} className="text-left">
                        <p
                          className="text-[10px] leading-snug line-clamp-2"
                          style={{ color: i === snap.currentIndex ? '#3a8eff' : 'rgba(255,255,255,0.65)' }}
                        >
                          {i === snap.currentIndex && <span className="text-[#CC0000] font-black mr-1">▶</span>}
                          {story.title}
                        </p>
                        <span className="text-[8px] text-blue-500/60 font-mono">{story.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Ticker stories={tickerStories} />
    </div>
  );
}
