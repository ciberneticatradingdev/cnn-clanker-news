'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NewsItem } from '../api/broadcast/route';
import type { BrainState } from '../api/brain/dialogue';

interface AIAnchorProps {
  story: NewsItem | null;
  currentIndex: number;
  startedAt: number;
  storyCount: number;
  totalStories: number;
  analysis: string | null;
  audioId: string | null;
  brainState: BrainState;
  anchorText: string;
}

// ─── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, trigger: string) {
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTriggerRef = useRef('');

  useEffect(() => {
    if (trigger === prevTriggerRef.current) return;
    prevTriggerRef.current = trigger;

    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!text) { setDisplayed(''); setTyping(false); return; }

    setDisplayed('');
    setTyping(true);
    let i = 0;

    const type = () => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
        const ch = text[i - 1];
        const delay = ch === '.' || ch === ',' ? 50 : 16;
        timerRef.current = setTimeout(type, delay);
      } else {
        setTyping(false);
      }
    };
    timerRef.current = setTimeout(type, 80);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return { displayed, typing };
}

// ─── Anchor Avatar SVG ─────────────────────────────────────────────────────────

function AnchorAvatar({ state, isSpeaking }: { state: BrainState; isSpeaking: boolean }) {
  const isThinking = state === 'THINKING';
  const isBreaking = state === 'BREAKING';
  const isScanning = state === 'SCANNING';
  const isMonologue = state === 'MONOLOGUE';

  const eyeColor = isBreaking ? '#ff4444' : isThinking ? '#f59e0b' : isSpeaking ? '#3a8eff' : isMonologue ? '#a855f7' : '#1a5abf';
  const glowColor = isBreaking ? 'rgba(204,0,0,0.6)' : isThinking ? 'rgba(245,158,11,0.6)' : isMonologue ? 'rgba(168,85,247,0.4)' : isScanning ? 'rgba(58,142,255,0.4)' : 'rgba(58,142,255,0.5)';
  const bodyGlow = isBreaking
    ? 'drop-shadow(0 0 14px #cc0000) drop-shadow(0 0 28px rgba(204,0,0,0.4))'
    : isSpeaking || isMonologue
    ? 'drop-shadow(0 0 14px #3a8eff) drop-shadow(0 0 28px rgba(58,142,255,0.5))'
    : isThinking
    ? 'drop-shadow(0 0 10px rgba(245,158,11,0.7))'
    : isScanning
    ? 'drop-shadow(0 0 8px rgba(58,142,255,0.4))'
    : 'drop-shadow(0 0 4px rgba(58,142,255,0.3))';

  const shouldPulseEyes = isSpeaking || isThinking || isBreaking || isScanning || isMonologue;

  return (
    <div className="relative flex items-center justify-center w-full" style={{ height: 240 }}>
      {/* Glow backdrop */}
      <div
        className="absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          background: `radial-gradient(circle, ${glowColor.replace('0.6', '0.3').replace('0.5', '0.2')} 0%, rgba(10,22,40,0) 70%)`,
          animation: (isSpeaking || isThinking || isBreaking) ? 'pulse-glow 1s ease-in-out infinite alternate' : isScanning ? 'pulse-glow 1.5s ease-in-out infinite alternate' : undefined,
        }}
      />

      {/* Thinking ring */}
      {isThinking && (
        <div
          className="absolute rounded-full border-2"
          style={{
            width: 176,
            height: 176,
            borderColor: 'rgba(245,158,11,0.5)',
            animation: 'pulse-glow 0.7s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Breaking ring */}
      {isBreaking && (
        <>
          <div className="absolute rounded-full border-2" style={{ width: 186, height: 186, borderColor: 'rgba(204,0,0,0.7)', animation: 'pulse-glow 0.4s ease-in-out infinite alternate' }} />
          <div className="absolute rounded-full border" style={{ width: 196, height: 196, borderColor: 'rgba(204,0,0,0.3)', animation: 'pulse-glow 0.6s ease-in-out infinite alternate' }} />
        </>
      )}

      {/* Scanning ring */}
      {isScanning && (
        <div
          className="absolute rounded-full border"
          style={{
            width: 180,
            height: 180,
            borderColor: 'rgba(58,142,255,0.4)',
            borderStyle: 'dashed',
            animation: 'spin 3s linear infinite',
          }}
        />
      )}

      {/* Anchor silhouette */}
      <svg
        width="150"
        height="210"
        viewBox="0 0 160 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
        style={{ filter: bodyGlow, transition: 'filter 0.4s ease' }}
      >
        <rect x="20" y="160" width="120" height="60" rx="4" fill="#1a3a6b" opacity="0.9" />
        <rect x="30" y="165" width="100" height="8" rx="2" fill="#2a5a9b" opacity="0.6" />
        <text x="80" y="196" textAnchor="middle" fill="#3a8eff" fontSize="10" fontWeight="bold" fontFamily="monospace">$CNN</text>
        <rect x="42" y="120" width="76" height="50" rx="8" fill="#1a3a6b" />
        <polygon points="80,122 87,122 84,158 76,158" fill={isBreaking ? '#CC0000' : '#CC0000'} />
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
          fill={eyeColor}
          style={{ animation: shouldPulseEyes ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
        />
        <ellipse
          cx="92" cy="84" rx="5" ry="4"
          fill={eyeColor}
          style={{ animation: shouldPulseEyes ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
        />
        <circle cx="70" cy="82" r="1.5" fill="white" opacity="0.8" />
        <circle cx="94" cy="82" r="1.5" fill="white" opacity="0.8" />
        <ellipse cx="80" cy="91" rx="3" ry="2" fill="#b08060" />
        {isSpeaking || isMonologue ? (
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
        <circle cx="49" cy="88" r="1.5" fill={isBreaking ? '#ff4444' : '#3a8eff'} opacity="0.8" />
      </svg>

      {/* Waveform bars */}
      <div
        className="absolute bottom-0 left-1/2 flex items-end gap-[3px]"
        style={{ transform: 'translateX(-50%)', height: 40, paddingBottom: 4 }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const active = isSpeaking || isMonologue;
          const subtle = isThinking || isScanning;
          return (
            <div
              key={i}
              className="w-[3px] rounded-full"
              style={{
                backgroundColor: isBreaking ? '#CC0000' : active ? '#3a8eff' : isThinking ? '#f59e0b' : isScanning ? '#3a8eff' : isMonologue ? '#a855f7' : '#1a3a6b',
                height: (active || subtle) ? undefined : 4,
                minHeight: 4,
                maxHeight: 36,
                animation: (active || subtle)
                  ? `wave-bar ${0.4 + i * 0.07}s ease-in-out infinite alternate`
                  : undefined,
                animationDelay: `${i * 0.06}s`,
                transition: 'background-color 0.3s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── State Panels ──────────────────────────────────────────────────────────────

function ScanningPanel({ text }: { text: string }) {
  const { displayed, typing } = useTypewriter(text, text.slice(0, 40));
  const feeds = ['CoinDesk', 'CoinTelegraph', 'Decrypt', 'The Block', 'Bankless'];

  return (
    <div className="mt-4 w-full rounded border border-blue-700/40 bg-[#050d1a] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-blue-500" style={{ animation: `status-pulse 0.6s ease-in-out ${i * 0.2}s infinite alternate` }} />
          ))}
        </div>
        <span className="text-[10px] font-black tracking-widest text-blue-400">SCANNING FEEDS</span>
      </div>

      {text && (
        <p className="text-blue-200/80 text-xs leading-relaxed mb-3">
          {displayed}
          {typing && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-blue-400 animate-pulse align-middle" />}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {feeds.map((feed, i) => (
          <div
            key={feed}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono"
            style={{
              background: 'rgba(58,142,255,0.08)',
              border: '1px solid rgba(58,142,255,0.2)',
              color: '#3a8eff',
              animation: `status-pulse 1s ease-in-out ${i * 0.15}s infinite alternate`,
            }}
          >
            <div className="h-1 w-1 rounded-full bg-green-400" />
            {feed}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingPanel({ text }: { text: string }) {
  const { displayed, typing } = useTypewriter(text, text.slice(0, 40));

  return (
    <div className="mt-4 w-full rounded border border-yellow-800/50 bg-[#120a00] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🧠</span>
        <span className="text-[10px] font-black tracking-widest text-yellow-400">AI ANALYSIS</span>
        {typing && <span className="text-[9px] text-yellow-600/60 font-mono animate-pulse">PROCESSING...</span>}
      </div>
      {text ? (
        <p className="text-yellow-200/80 text-xs leading-relaxed">
          {displayed}
          {typing && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-yellow-400 animate-pulse align-middle" />}
        </p>
      ) : (
        <div className="flex gap-1.5">
          {[0,1,2,3,4,5,6].map(i => (
            <div key={i} className="h-1 rounded-full bg-yellow-600/60" style={{ width: `${8 + Math.sin(i) * 6}px`, animation: `wave-bar ${0.4 + i * 0.08}s ease-in-out infinite alternate`, animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      )}
      <div className="mt-2 text-yellow-700/50 text-[9px] font-mono">Groq Llama 3.3 · Connecting dots</div>
    </div>
  );
}

function MonologuePanel({ text }: { text: string }) {
  const { displayed, typing } = useTypewriter(text, text.slice(0, 40));

  return (
    <div className="mt-4 w-full rounded border border-purple-800/50 bg-[#0e0520] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">💬</span>
        <span className="text-[10px] font-black tracking-widest text-purple-400">LIVE COMMENTARY</span>
      </div>
      <p className="text-purple-200/85 text-xs leading-relaxed">
        {displayed}
        {typing && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse align-middle" />}
      </p>
    </div>
  );
}

function BreakingPanel({ story, analysis, analysisText, isTypingAnalysis }: {
  story: NewsItem;
  analysis: string | null;
  analysisText: string;
  isTypingAnalysis: boolean;
}) {
  const { displayed: headlineText, typing: typingHeadline } = useTypewriter(story.title, story.id);

  return (
    <>
      <div className="mt-4 w-full rounded border-2 border-red-600/80 bg-[#1a0000] p-4" style={{ boxShadow: '0 0 20px rgba(204,0,0,0.3)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-red-500" style={{ animation: 'live-pulse 0.5s ease-in-out infinite' }} />
          <span className="text-[10px] font-black tracking-widest text-red-400">BREAKING NEWS</span>
          <span className="text-[10px] text-red-600/70 font-mono uppercase">{story.source}</span>
        </div>
        <p className="text-white font-bold leading-snug text-sm">
          {headlineText}
          {typingHeadline && <span className="ml-0.5 inline-block w-0.5 h-4 bg-red-400 animate-pulse align-middle" />}
        </p>
        {story.summary && story.summary !== 'Developing story.' && (
          <p className="mt-2 text-red-200/60 text-xs leading-relaxed">{story.summary}</p>
        )}
      </div>

      {(analysisText || isTypingAnalysis) && (
        <div className="mt-3 w-full rounded border border-purple-800/50 bg-[#12082a] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded px-2 py-0.5 text-[9px] font-black text-white tracking-widest" style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}>
              🤖 CNN AI INSIGHT
            </span>
            {isTypingAnalysis && <span className="text-[9px] text-purple-400/60 font-mono animate-pulse">GROQ ANALYZING...</span>}
          </div>
          <p className="text-purple-200/80 text-xs leading-relaxed">
            {analysisText}
            {isTypingAnalysis && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse align-middle" />}
          </p>
        </div>
      )}
    </>
  );
}

function ReportingPanel({ story, analysis }: { story: NewsItem; analysis: string | null }) {
  const { displayed: headlineText, typing: typingHeadline } = useTypewriter(story.title, story.id);
  const { displayed: analysisText, typing: typingAnalysis } = useTypewriter(analysis ?? '', `${story.id}-${analysis?.slice(0, 20) ?? ''}`);

  return (
    <>
      {/* Headline */}
      <div className="mt-4 w-full rounded border border-blue-800/40 bg-[#0d1f3c] p-4 min-h-[80px]">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded px-2 py-0.5 text-[10px] font-black text-white tracking-widest" style={{ backgroundColor: story.isBreaking ? '#CC0000' : '#1a3a6b' }}>
            {story.isBreaking ? 'BREAKING' : 'REPORTING'}
          </span>
          <span className="text-[10px] text-blue-400 font-mono uppercase">{story.source}</span>
          <span className="text-[10px] text-blue-600/60 font-mono">{story.category}</span>
        </div>
        <p className="text-white font-semibold leading-snug text-sm min-h-[40px]">
          {headlineText}
          {typingHeadline && <span className="ml-0.5 inline-block w-0.5 h-4 bg-blue-400 animate-pulse align-middle" />}
        </p>
      </div>

      {/* Summary */}
      {!typingHeadline && story.summary && story.summary !== 'Developing story.' && (
        <div className="mt-3 w-full rounded bg-[#0d1f3c]/60 p-3 border border-blue-900/30">
          <p className="text-blue-200/70 text-xs leading-relaxed">{story.summary}</p>
        </div>
      )}

      {/* Analysis */}
      {(analysisText || typingAnalysis) && !typingHeadline && (
        <div className="mt-3 w-full rounded border border-purple-800/50 bg-[#12082a] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded px-2 py-0.5 text-[9px] font-black text-white tracking-widest" style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}>
              🤖 CNN AI INSIGHT
            </span>
            {typingAnalysis && <span className="text-[9px] text-purple-400/60 font-mono animate-pulse">GROQ ANALYZING...</span>}
          </div>
          <p className="text-purple-200/80 text-xs leading-relaxed">
            {analysisText}
            {typingAnalysis && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse align-middle" />}
          </p>
        </div>
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AIAnchor({
  story,
  currentIndex,
  storyCount,
  totalStories,
  analysis,
  audioId,
  brainState,
  anchorText,
}: AIAnchorProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [barsActive, setBarsActive] = useState(false);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevAudioIdRef = useRef<string | null>(null);
  const muteRef = useRef(muted);
  useEffect(() => { muteRef.current = muted; }, [muted]);

  // ── Audio playback ────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // ── Derived status label ────────────────────────────────────────────────────

  const statusLabel = brainState === 'BREAKING'
    ? 'BREAKING NEWS'
    : brainState === 'THINKING'
    ? 'AI THINKING...'
    : brainState === 'MONOLOGUE'
    ? 'COMMENTARY'
    : brainState === 'SCANNING'
    ? 'SCANNING FEEDS'
    : isSpeaking
    ? 'ON AIR'
    : 'STANDBY';

  const statusColor = brainState === 'BREAKING'
    ? '#ff4444'
    : brainState === 'THINKING'
    ? '#f59e0b'
    : brainState === 'MONOLOGUE'
    ? '#a855f7'
    : brainState === 'SCANNING'
    ? '#3a8eff'
    : isSpeaking
    ? '#00ff88'
    : '#666';

  const dotAnimation = (brainState !== 'REPORTING' || isSpeaking) ? 'status-pulse 0.6s ease-in-out infinite alternate' : undefined;

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Anchor Avatar */}
      <AnchorAvatar state={brainState} isSpeaking={isSpeaking || barsActive} />

      {/* Status row */}
      <div className="mt-2 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}`, animation: dotAnimation }}
          />
          <span className="text-xs font-mono" style={{ color: statusColor }}>
            {statusLabel}
            {(brainState === 'THINKING' || brainState === 'SCANNING') && (
              <span style={{ animation: 'status-pulse 0.5s ease-in-out infinite alternate' }}> ●●●</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
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
            {brainState === 'REPORTING' || brainState === 'BREAKING'
              ? `STORY ${currentIndex + 1} / ${totalStories}`
              : `COVERED: ${storyCount}`}
          </span>
        </div>
      </div>

      {/* State-specific content panel — always shows something */}
      {brainState === 'SCANNING' && (
        <ScanningPanel text={anchorText} />
      )}

      {brainState === 'THINKING' && (
        <ThinkingPanel text={anchorText} />
      )}

      {brainState === 'MONOLOGUE' && (
        <MonologuePanel text={anchorText} />
      )}

      {brainState === 'BREAKING' && story && (
        <BreakingPanel
          story={story}
          analysis={analysis}
          analysisText={analysis ?? ''}
          isTypingAnalysis={false}
        />
      )}

      {brainState === 'REPORTING' && story && (
        <ReportingPanel story={story} analysis={analysis} />
      )}

      {/* If no story yet in reporting/breaking, show scanning */}
      {(brainState === 'REPORTING' || brainState === 'BREAKING') && !story && (
        <ScanningPanel text={anchorText || 'Preparing first story. Stand by.'} />
      )}
    </div>
  );
}
