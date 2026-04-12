'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { NewsItem } from './types';
import Ticker from './components/Ticker';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';
import NewsGrid from './components/NewsGrid';
import BreakingBanner from './components/BreakingBanner';

const AIAnchor = dynamic(() => import('./components/AIAnchor'), { ssr: false });

const ROTATE_INTERVAL_MS = 20_000; // rotate story every 20s
const POLL_INTERVAL_MS = 60_000;   // refresh news every 60s

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
  const [stories, setStories] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [breakingStory, setBreakingStory] = useState<NewsItem | null>(null);
  const [activeTab, setActiveTab] = useState<'anchor' | 'grid'>('anchor');
  const [sourcesActive, setSourcesActive] = useState(5);
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [loaded, setLoaded] = useState(false);

  const storiesRef = useRef<NewsItem[]>([]);
  const currentIndexRef = useRef(0);
  const analyzeInFlightRef = useRef<string | null>(null);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch news ───────────────────────────────────────────────────────────────

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      if (!res.ok) return;
      const data = await res.json();
      const incoming: NewsItem[] = data.stories ?? [];
      if (incoming.length === 0) return;

      setSourcesActive(data.sources ?? 5);

      // Detect breaking stories (appeared since last fetch)
      const prevIds = new Set(storiesRef.current.map(s => s.id));
      const breaking = incoming.filter(s => s.isBreaking && !prevIds.has(s.id));
      if (breaking.length > 0) {
        setBreakingStory(breaking[0]);
      }

      storiesRef.current = incoming;
      setStories(incoming);
      setLoaded(true);
    } catch {
      // silently swallow — we'll retry on next poll
    }
  }, []);

  // ── Analyze current story ────────────────────────────────────────────────────

  const analyzeStory = useCallback(async (story: NewsItem) => {
    if (analyzeInFlightRef.current === story.id) return;
    analyzeInFlightRef.current = story.id;
    setIsThinking(true);
    setAnalysis(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: story.title,
          summary: story.summary,
          source: story.source,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis ?? null);
        setTotalAnalyzed(n => n + 1);
      }
    } catch {
      // no analysis
    } finally {
      setIsThinking(false);
      analyzeInFlightRef.current = null;
    }
  }, []);

  // ── Story rotation ───────────────────────────────────────────────────────────

  const scheduleRotate = useCallback(() => {
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = setTimeout(() => {
      const list = storiesRef.current;
      if (list.length === 0) return;
      const next = (currentIndexRef.current + 1) % list.length;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      setStartedAt(Date.now());
      setAnalysis(null);
      analyzeStory(list[next]);
      scheduleRotate();
    }, ROTATE_INTERVAL_MS);
  }, [analyzeStory]);

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchNews().then(() => {
      const list = storiesRef.current;
      if (list.length > 0) {
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        setStartedAt(Date.now());
        analyzeStory(list[0]);
        scheduleRotate();
      }
    });

    const pollId = setInterval(fetchNews, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollId);
      if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger analyze when stories first load and there's a current story
  useEffect(() => {
    if (!loaded) return;
    const list = storiesRef.current;
    if (list.length > 0 && analyzeInFlightRef.current === null && analysis === null && !isThinking) {
      analyzeStory(list[currentIndexRef.current]);
      scheduleRotate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const story = stories[currentIndex] ?? null;

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
                <span className="text-[9px] text-blue-300/50 tracking-wider">AI-POWERED · CRYPTO NEWS</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: loaded ? '#CC0000' : '#666', animation: loaded ? 'live-pulse 1.5s ease-in-out infinite' : undefined }}
              />
              <span className="text-xs font-black text-white tracking-widest">{loaded ? 'LIVE' : 'LOADING...'}</span>
            </div>
            <LiveClock />
          </div>
        </div>

        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #CC0000 20%, #3a8eff 50%, #CC0000 80%, transparent)' }} />
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-4 pt-4">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-blue-600 border-t-transparent" style={{ animation: 'spin 1s linear infinite' }} />
            <div className="text-blue-400 font-mono text-sm tracking-wider">FETCHING CRYPTO FEEDS...</div>
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
              storyCount={stories.length}
              sourcesActive={sourcesActive}
              totalAnalyzed={totalAnalyzed}
              startedAt={startedAt}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-4">
              {/* Left Sidebar */}
              <div className="hidden lg:block">
                <Sidebar
                  stories={stories}
                  currentIndex={currentIndex}
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
                      <span className="text-[10px] font-black tracking-widest text-white">AI ANCHOR — LIVE CRYPTO BROADCAST</span>
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
                        story={story}
                        currentIndex={currentIndex}
                        startedAt={startedAt}
                        totalStories={stories.length}
                        analysis={analysis}
                        isThinking={isThinking}
                      />
                    ) : (
                      <NewsGrid
                        stories={stories}
                        currentIndex={currentIndex}
                        onSelect={() => {}}
                      />
                    )}
                  </div>
                </div>

                {/* Feature story strip */}
                {stories.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {stories.slice(currentIndex, currentIndex + 3).map((s, i) => (
                      <div
                        key={s.id}
                        className="rounded border p-3"
                        style={{
                          borderColor: i === 0 ? 'rgba(58,142,255,0.4)' : 'rgba(26,58,107,0.5)',
                          background: i === 0 ? 'rgba(58,142,255,0.05)' : '#0d1f3c',
                        }}
                      >
                        <div className="mb-1 text-[9px] font-black uppercase tracking-wider" style={{ color: i === 0 ? '#CC0000' : '#3a8eff' }}>
                          {i === 0 ? '▶ ON AIR NOW' : `${s.category} · ${s.source}`}
                        </div>
                        <p className="text-white/80 text-xs leading-snug line-clamp-2">{s.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(26,58,107,0.5)', background: '#0d1f3c' }}>
                  <h3 className="text-[10px] font-black tracking-widest text-blue-400 uppercase border-b border-blue-800/40 pb-2 mb-3">About $CNN</h3>
                  <p className="text-xs text-white/60 leading-relaxed">Clanker News Network is an AI-powered crypto news channel built on Base. Our AI anchor monitors the blockchain 24/7 and delivers real-time analysis of DeFi, memecoins, and on-chain activity.</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {[
                      { label: 'Token', value: '$CNN', color: 'text-white' },
                      { label: 'Network', value: 'BASE', color: 'text-green-400' },
                      { label: 'Creator', value: 'Clanker', color: 'text-blue-300' },
                      { label: 'AI Model', value: 'Llama 3.3', color: 'text-purple-400' },
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
                    { name: 'CoinDesk', quality: 98, color: '#CC0000' },
                    { name: 'CoinTelegraph', quality: 95, color: '#FF6600' },
                    { name: 'Decrypt', quality: 91, color: '#3a8eff' },
                    { name: 'The Block', quality: 88, color: '#00c896' },
                    { name: 'Bankless', quality: 93, color: '#a855f7' },
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
                    {stories.slice(0, 6).map((s, i) => (
                      <div key={s.id} className="text-left">
                        <p
                          className="text-[10px] leading-snug line-clamp-2"
                          style={{ color: i === currentIndex ? '#3a8eff' : 'rgba(255,255,255,0.65)' }}
                        >
                          {i === currentIndex && <span className="text-[#CC0000] font-black mr-1">▶</span>}
                          {s.title}
                        </p>
                        <span className="text-[8px] text-blue-500/60 font-mono">{s.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Ticker stories={stories.slice(0, 20)} />
    </div>
  );
}
