'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NewsItem } from '../api/broadcast/route';

interface AIAnchorProps {
  story: NewsItem | null;
  currentIndex: number;
  startedAt: number;
  storyCount: number;
  totalStories: number;
}

// ─── Anchor narration builder ──────────────────────────────────────────────────

const TRANSITIONS = [
  'Moving on to our next story. ',
  'In other news. ',
  'Developing story. ',
  'Sources are reporting. ',
  'Our correspondents have confirmed. ',
  'We are monitoring this situation closely. ',
  'Turning now to another developing story. ',
];

const STATION_IDS = [
  'You are watching the Clanker News Network. Stay with us. ',
  'This is CNN — the Clanker News Network. We continue our coverage. ',
  'We appreciate you tuning in to the Clanker News Network. ',
];

function buildNarration(story: NewsItem, storyCount: number): string {
  const isFirst = storyCount <= 1;

  let prefix = '';
  if (isFirst) {
    prefix = 'Good evening. This is the Clanker News Network. I am your AI anchor. Let us begin. ';
  } else if (storyCount % 5 === 0) {
    prefix = STATION_IDS[(storyCount / 5) % STATION_IDS.length];
  } else {
    prefix = TRANSITIONS[(storyCount - 1) % TRANSITIONS.length];
  }

  const isBreaking = story.isBreaking ? 'Breaking news. ' : '';
  const source = `From ${story.source}. `;
  const headline = `${story.title}. `;
  const summary = story.summary && story.summary !== 'Read the full story.' ? `${story.summary}. ` : '';
  const sign = 'This is Clanker, reporting live. ';

  return prefix + isBreaking + source + headline + summary + sign;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAnchor({ story, currentIndex, startedAt, storyCount, totalStories }: AIAnchorProps) {
  const [displayText, setDisplayText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [barsActive, setBarsActive] = useState(false);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStoryIdRef = useRef<string | null>(null);

  const clearTypewriter = useCallback(() => {
    if (typeTimerRef.current) {
      clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }
  }, []);

  const typeText = useCallback((text: string, onDone?: () => void) => {
    clearTypewriter();
    setDisplayText('');
    setIsTyping(true);
    let i = 0;

    const type = () => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
        const ch = text[i - 1];
        const delay = (ch === '.' || ch === ',') ? 55 : 18;
        typeTimerRef.current = setTimeout(type, delay);
      } else {
        setIsTyping(false);
        onDone?.();
      }
    };
    typeTimerRef.current = setTimeout(type, 60);
  }, [clearTypewriter]);

  const speakNarration = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google US English') ||
      v.name.includes('Alex') ||
      v.name.includes('Daniel') ||
      (v.lang === 'en-US' && v.name.includes('Male'))
    ) ?? voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB');
    if (preferred) utter.voice = preferred;

    utter.rate = 0.9;
    utter.pitch = 0.93;
    utter.volume = 0.92;

    utter.onstart = () => { setIsSpeaking(true); setBarsActive(true); setIsAnalyzing(false); };
    utter.onend = () => {
      setIsSpeaking(false);
      setBarsActive(false);
      setIsAnalyzing(true); // show "ANALYZING FEEDS..." until next story
    };
    utter.onerror = () => {
      setIsSpeaking(false);
      setBarsActive(false);
      setIsAnalyzing(true);
    };

    window.speechSynthesis.speak(utter);
  }, []);

  // Load voices on mount (Chrome needs onvoiceschanged)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      window.speechSynthesis.cancel();
    };
  }, []);

  // React to story changes from SSE
  useEffect(() => {
    if (!story) {
      setIsAnalyzing(true);
      setDisplayText('');
      return;
    }

    // Deduplicate — only act if story actually changed
    if (story.id === prevStoryIdRef.current) return;
    prevStoryIdRef.current = story.id;

    clearTypewriter();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setBarsActive(false);
    setIsAnalyzing(false);

    const narration = buildNarration(story, storyCount);

    // Type the headline, then speak full narration
    typeText(story.title, () => {
      setTimeout(() => speakNarration(narration), 300);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, startedAt]);

  const bars = Array.from({ length: 9 });

  const statusLabel = isAnalyzing
    ? 'ANALYZING FEEDS...'
    : isTyping
    ? 'PROCESSING...'
    : isSpeaking
    ? 'ON AIR'
    : 'STANDBY';

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
              : isAnalyzing
              ? 'drop-shadow(0 0 6px rgba(58,142,255,0.2))'
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
            fill={isSpeaking ? '#3a8eff' : isAnalyzing ? '#1a3a8f' : '#1a5abf'}
            style={{ animation: isSpeaking ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
          />
          <ellipse
            cx="92" cy="84" rx="5" ry="4"
            fill={isSpeaking ? '#3a8eff' : isAnalyzing ? '#1a3a8f' : '#1a5abf'}
            style={{ animation: isSpeaking ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
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
                backgroundColor: barsActive ? '#3a8eff' : isAnalyzing ? '#1a3060' : '#1a3a6b',
                height: barsActive ? undefined : 4,
                minHeight: 4,
                maxHeight: 36,
                animation: barsActive
                  ? `wave-bar ${0.4 + i * 0.07}s ease-in-out infinite alternate`
                  : isAnalyzing
                  ? `wave-bar ${0.8 + i * 0.12}s ease-in-out infinite alternate`
                  : undefined,
                animationDelay: `${i * 0.06}s`,
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Status + story counter */}
      <div className="mt-2 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: isSpeaking ? '#00ff88' : isAnalyzing ? '#f59e0b' : '#666',
              boxShadow: isSpeaking ? '0 0 6px #00ff88' : isAnalyzing ? '0 0 6px #f59e0b' : 'none',
              animation: (isSpeaking || isAnalyzing) ? 'status-pulse 0.6s ease-in-out infinite alternate' : undefined,
            }}
          />
          <span className="text-xs font-mono" style={{ color: isSpeaking ? '#00ff88' : isAnalyzing ? '#f59e0b' : '#666' }}>
            {statusLabel}
          </span>
        </div>
        <span className="text-[10px] text-blue-500 font-mono">
          STORY {currentIndex + 1} / {totalStories}
        </span>
      </div>

      {/* Analyzing overlay */}
      {isAnalyzing && !isSpeaking && !story && (
        <div className="mt-4 w-full rounded border border-yellow-800/40 bg-[#1a1200] p-4 text-center">
          <div className="text-yellow-400 font-mono text-sm font-black tracking-widest animate-pulse">
            ANALYZING FEEDS...
          </div>
          <div className="text-yellow-600/60 text-[10px] mt-1">Next broadcast segment loading</div>
        </div>
      )}

      {/* Headline display */}
      {story && (
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
            {displayText}
            {isTyping && <span className="ml-0.5 inline-block w-0.5 h-4 bg-blue-400 animate-pulse align-middle" />}
          </p>
        </div>
      )}

      {/* Story summary */}
      {story && !isTyping && (
        <div className="mt-3 w-full rounded bg-[#0d1f3c]/60 p-3 border border-blue-900/30">
          <p className="text-blue-200/70 text-xs leading-relaxed">{story.summary}</p>
        </div>
      )}

      {/* Analyzing banner between stories */}
      {isAnalyzing && story && (
        <div className="mt-3 w-full rounded border border-yellow-800/30 bg-[#1a1200]/60 p-2 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" style={{ animation: 'status-pulse 0.8s ease-in-out infinite alternate' }} />
          <span className="text-yellow-400/80 font-mono text-[10px] tracking-widest">ANALYZING FEEDS... NEXT STORY INCOMING</span>
        </div>
      )}
    </div>
  );
}
