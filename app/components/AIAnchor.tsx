'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NewsItem } from '../api/broadcast/route';

interface AIAnchorProps {
  story: NewsItem | null;
  currentIndex: number;
  startedAt: number;
  storyCount: number;
  totalStories: number;
  analysis: string | null;
  audioId: string | null;
  isThinking: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAnchor({
  story,
  currentIndex,
  startedAt,
  storyCount,
  totalStories,
  analysis,
  audioId,
  isThinking,
}: AIAnchorProps) {
  const [headlineText, setHeadlineText] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTypingHeadline, setIsTypingHeadline] = useState(false);
  const [isTypingAnalysis, setIsTypingAnalysis] = useState(false);
  const [barsActive, setBarsActive] = useState(false);
  const [muted, setMuted] = useState(false);

  const headlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevStoryIdRef = useRef<string | null>(null);
  const prevAudioIdRef = useRef<string | null>(null);
  const muteRef = useRef(muted);
  useEffect(() => { muteRef.current = muted; }, [muted]);

  // ── Typewriter helpers ──────────────────────────────────────────────────────

  const typeText = useCallback((
    text: string,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    setter: (t: string) => void,
    setTyping: (b: boolean) => void,
    onDone?: () => void,
  ) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setter('');
    setTyping(true);
    let i = 0;

    const type = () => {
      if (i < text.length) {
        setter(text.slice(0, i + 1));
        i++;
        const ch = text[i - 1];
        const delay = ch === '.' || ch === ',' ? 55 : 18;
        timerRef.current = setTimeout(type, delay);
      } else {
        setTyping(false);
        onDone?.();
      }
    };
    timerRef.current = setTimeout(type, 60);
  }, []);

  // ── Audio playback ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!audioId || audioId === prevAudioIdRef.current) return;
    prevAudioIdRef.current = audioId;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    const audio = new Audio(`/api/tts?id=${audioId}`);
    audio.muted = muteRef.current;
    audioRef.current = audio;

    audio.onplay = () => { setIsSpeaking(true); setBarsActive(true); };
    audio.onended = () => { setIsSpeaking(false); setBarsActive(false); };
    audio.onerror = () => { setIsSpeaking(false); setBarsActive(false); };

    audio.play().catch(err => console.error('Audio play failed:', err));
  }, [audioId]);

  // Sync mute state to active audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // ── Story change ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!story) return;
    if (story.id === prevStoryIdRef.current) return;
    prevStoryIdRef.current = story.id;

    // Clear previous typewriters
    if (headlineTimerRef.current) { clearTimeout(headlineTimerRef.current); headlineTimerRef.current = null; }
    if (analysisTimerRef.current) { clearTimeout(analysisTimerRef.current); analysisTimerRef.current = null; }
    if (analysisDelayRef.current) { clearTimeout(analysisDelayRef.current); analysisDelayRef.current = null; }
    setAnalysisText('');
    setIsTypingAnalysis(false);

    typeText(story.title, headlineTimerRef, setHeadlineText, setIsTypingHeadline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, startedAt]);

  // ── Analysis typewriter (delayed so headline starts first) ─────────────────

  useEffect(() => {
    if (!analysis) { setAnalysisText(''); return; }
    if (analysisDelayRef.current) clearTimeout(analysisDelayRef.current);
    if (analysisTimerRef.current) { clearTimeout(analysisTimerRef.current); analysisTimerRef.current = null; }

    analysisDelayRef.current = setTimeout(() => {
      typeText(analysis, analysisTimerRef, setAnalysisText, setIsTypingAnalysis);
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (headlineTimerRef.current) clearTimeout(headlineTimerRef.current);
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
      if (analysisDelayRef.current) clearTimeout(analysisDelayRef.current);
      audioRef.current?.pause();
    };
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────

  const bars = Array.from({ length: 9 });

  const statusLabel = isThinking
    ? 'AI THINKING...'
    : isSpeaking
    ? 'ON AIR'
    : isTypingHeadline
    ? 'PROCESSING...'
    : 'STANDBY';

  const showAnalyzing = isThinking && !story;

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Anchor avatar */}
      <div className="relative flex items-center justify-center w-full" style={{ height: 260 }}>
        {/* Glow backdrop */}
        <div
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(26,58,107,0.8) 0%, rgba(10,22,40,0) 70%)',
            animation: isSpeaking ? 'pulse-glow 1s ease-in-out infinite alternate' : undefined,
          }}
        />

        {/* Brain/thinking pulse ring */}
        {isThinking && (
          <div
            className="absolute rounded-full border-2"
            style={{
              width: 180,
              height: 180,
              borderColor: 'rgba(245,158,11,0.6)',
              animation: 'pulse-glow 0.6s ease-in-out infinite alternate',
            }}
          />
        )}

        {/* Anchor silhouette */}
        <svg
          width="160"
          height="220"
          viewBox="0 0 160 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
          style={{
            filter: isSpeaking
              ? 'drop-shadow(0 0 14px #3a8eff) drop-shadow(0 0 28px rgba(58,142,255,0.5))'
              : isThinking
              ? 'drop-shadow(0 0 10px rgba(245,158,11,0.6))'
              : 'drop-shadow(0 0 4px rgba(58,142,255,0.3))',
            transition: 'filter 0.4s ease',
          }}
        >
          <rect x="20" y="160" width="120" height="60" rx="4" fill="#1a3a6b" opacity="0.9" />
          <rect x="30" y="165" width="100" height="8" rx="2" fill="#2a5a9b" opacity="0.6" />
          <text x="80" y="196" textAnchor="middle" fill="#3a8eff" fontSize="10" fontWeight="bold" fontFamily="monospace">$CNN</text>
          <rect x="42" y="120" width="76" height="50" rx="8" fill="#1a3a6b" />
          <polygon points="80,122 87,122 84,158 76,158" fill="#CC0000" />
          <polygon points="80,122 86,126 80,132 74,126" fill="#aa0000" />
          <polygon points="67,120 80,130 80,120" fill="white" opacity="0.9" />
          <polygon points="93,120 80,130 80,120" fill="white" opacity="0.85" />
          <rect x="70" y="105" width="20" height="20" rx="6" fill="#c8a882" />
          <ellipse cx="80" cy="88" rx="32" ry="34" fill="#c8a882" />
          <circle cx="80" cy="88" r="32" fill="none" stroke="#3a8eff" strokeWidth="1.5" opacity="0.4" />
          <line x1="48" y1="88" x2="55" y2="88" stroke="#3a8eff" strokeWidth="1" opacity="0.6" />
          <line x1="105" y1="88" x2="112" y2="88" stroke="#3a8eff" strokeWidth="1" opacity="0.6" />
          <line x1="80" y1="56" x2="80" y2="62" stroke="#3a8eff" strokeWidth="1" opacity="0.6" />
          <ellipse cx="68" cy="84" rx="7" ry="6" fill="#0A1628" />
          <ellipse cx="92" cy="84" rx="7" ry="6" fill="#0A1628" />
          <ellipse
            cx="68" cy="84" rx="5" ry="4"
            fill={isSpeaking ? '#3a8eff' : isThinking ? '#f59e0b' : '#1a5abf'}
            style={{ animation: (isSpeaking || isThinking) ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
          />
          <ellipse
            cx="92" cy="84" rx="5" ry="4"
            fill={isSpeaking ? '#3a8eff' : isThinking ? '#f59e0b' : '#1a5abf'}
            style={{ animation: (isSpeaking || isThinking) ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
          />
          <circle cx="70" cy="82" r="1.5" fill="white" opacity="0.8" />
          <circle cx="94" cy="82" r="1.5" fill="white" opacity="0.8" />
          <ellipse cx="80" cy="91" rx="3" ry="2" fill="#b08060" />
          {isSpeaking ? (
            <>
              <ellipse cx="80" cy="99" rx="9" ry="5" fill="#0A1628" />
              <ellipse cx="80" cy="99" rx="7" ry="3" fill="#1a1a2e" />
            </>
          ) : (
            <path d="M71 99 Q80 104 89 99" stroke="#b08060" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
          <ellipse cx="80" cy="60" rx="30" ry="14" fill="#3a2a1a" />
          <rect x="50" y="58" width="60" height="12" rx="2" fill="#3a2a1a" />
          <ellipse cx="48" cy="88" rx="5" ry="7" fill="#c8a882" />
          <ellipse cx="112" cy="88" rx="5" ry="7" fill="#c8a882" />
          <circle cx="49" cy="88" r="3" fill="#0A1628" />
          <circle cx="49" cy="88" r="1.5" fill="#3a8eff" opacity="0.8" />
        </svg>

        {/* Waveform bars */}
        <div
          className="absolute bottom-0 left-1/2 flex items-end gap-[3px]"
          style={{ transform: 'translateX(-50%)', height: 40, paddingBottom: 4 }}
        >
          {bars.map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full"
              style={{
                backgroundColor: barsActive
                  ? '#3a8eff'
                  : isThinking
                  ? '#f59e0b'
                  : '#1a3a6b',
                height: barsActive ? undefined : 4,
                minHeight: 4,
                maxHeight: 36,
                animation: barsActive
                  ? `wave-bar ${0.4 + i * 0.07}s ease-in-out infinite alternate`
                  : isThinking
                  ? `wave-bar ${0.8 + i * 0.1}s ease-in-out infinite alternate`
                  : undefined,
                animationDelay: `${i * 0.06}s`,
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Status row */}
      <div className="mt-2 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: isSpeaking ? '#00ff88' : isThinking ? '#f59e0b' : '#666',
              boxShadow: isSpeaking ? '0 0 6px #00ff88' : isThinking ? '0 0 6px #f59e0b' : 'none',
              animation: (isSpeaking || isThinking) ? 'status-pulse 0.6s ease-in-out infinite alternate' : undefined,
            }}
          />
          <span className="text-xs font-mono" style={{ color: isSpeaking ? '#00ff88' : isThinking ? '#f59e0b' : '#666' }}>
            {statusLabel}
            {isThinking && (
              <span style={{ animation: 'status-pulse 0.5s ease-in-out infinite alternate' }}>
                {' '}●●●
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={() => setMuted(m => !m)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono transition-colors"
            style={{
              color: muted ? '#666' : '#3a8eff',
              border: '1px solid',
              borderColor: muted ? '#333' : 'rgba(58,142,255,0.4)',
              background: muted ? 'transparent' : 'rgba(58,142,255,0.05)',
            }}
          >
            {muted ? '🔇 MUTED' : '🔊 AUDIO'}
          </button>
          <span className="text-[10px] text-blue-500 font-mono">
            STORY {currentIndex + 1} / {totalStories}
          </span>
        </div>
      </div>

      {/* AI Thinking overlay */}
      {isThinking && (
        <div className="mt-4 w-full rounded border border-yellow-800/60 bg-[#1a1200] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧠</span>
            <div className="text-yellow-400 font-mono text-sm font-black tracking-widest animate-pulse">
              ANALYZING FEEDS...
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="h-1 rounded-full bg-yellow-600/60"
                style={{
                  width: `${8 + Math.sin(i) * 6}px`,
                  animation: `wave-bar ${0.4 + i * 0.08}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.07}s`,
                }}
              />
            ))}
          </div>
          <div className="text-yellow-600/50 text-[10px] mt-2 font-mono">
            Groq Llama 3.3 · OpenAI TTS · Onyx voice
          </div>
        </div>
      )}

      {/* Headline display */}
      {story && !isThinking && (
        <div className="mt-4 w-full rounded border border-blue-800/40 bg-[#0d1f3c] p-4 min-h-[80px]">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 text-[10px] font-black text-white tracking-widest"
              style={{ backgroundColor: story.isBreaking ? '#CC0000' : '#1a3a6b' }}
            >
              {story.isBreaking ? 'BREAKING' : 'REPORTING'}
            </span>
            <span className="text-[10px] text-blue-400 font-mono uppercase">{story.source}</span>
            <span className="text-[10px] text-blue-600/60 font-mono">{story.category}</span>
          </div>
          <p className="text-white font-semibold leading-snug text-sm min-h-[40px]">
            {headlineText}
            {isTypingHeadline && (
              <span className="ml-0.5 inline-block w-0.5 h-4 bg-blue-400 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}

      {/* Story summary */}
      {story && !isThinking && !isTypingHeadline && (
        <div className="mt-3 w-full rounded bg-[#0d1f3c]/60 p-3 border border-blue-900/30">
          <p className="text-blue-200/70 text-xs leading-relaxed">{story.summary}</p>
        </div>
      )}

      {/* CNN AI Insight */}
      {(analysisText || isTypingAnalysis) && !isThinking && (
        <div className="mt-3 w-full rounded border border-purple-800/50 bg-[#12082a] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="rounded px-2 py-0.5 text-[9px] font-black text-white tracking-widest"
              style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
            >
              🤖 CNN AI INSIGHT
            </span>
            {isTypingAnalysis && (
              <span className="text-[9px] text-purple-400/60 font-mono animate-pulse">GROQ ANALYZING...</span>
            )}
          </div>
          <p className="text-purple-200/80 text-xs leading-relaxed">
            {analysisText}
            {isTypingAnalysis && (
              <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
