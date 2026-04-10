'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NewsItem } from '../api/news/route';

interface AIAnchorProps {
  stories: NewsItem[];
  currentIndex: number;
  onNext: () => void;
}

export default function AIAnchor({ stories, currentIndex, onNext }: AIAnchorProps) {
  const [displayText, setDisplayText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [barsActive, setBarsActive] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentStory = stories[currentIndex];

  const speakStory = useCallback((story: NewsItem) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const text = `Breaking news from ${story.source}. ${story.title}. ${story.summary}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google US English') ||
      v.name.includes('Alex') ||
      v.name.includes('Daniel') ||
      v.lang === 'en-US'
    );
    if (preferred) utterance.voice = preferred;

    utterance.rate = 0.92;
    utterance.pitch = 0.95;
    utterance.volume = 0.9;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setBarsActive(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setBarsActive(false);
      // Auto-advance after a pause
      setTimeout(onNext, 3000);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setBarsActive(false);
      setTimeout(onNext, 5000);
    };

    window.speechSynthesis.speak(utterance);
  }, [onNext]);

  const typeText = useCallback((text: string, onDone?: () => void) => {
    setDisplayText('');
    setIsTyping(true);
    let i = 0;

    const type = () => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
        const delay = text[i - 1] === '.' || text[i - 1] === ',' ? 60 : 22;
        typewriterRef.current = setTimeout(type, delay);
      } else {
        setIsTyping(false);
        onDone?.();
      }
    };

    typewriterRef.current = setTimeout(type, 80);
  }, []);

  useEffect(() => {
    if (!currentStory) return;

    // Cancel previous
    if (typewriterRef.current) clearTimeout(typewriterRef.current);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setBarsActive(false);

    const fullText = currentStory.title;
    typeText(fullText, () => {
      // Start speaking after typing finishes
      setTimeout(() => speakStory(currentStory), 400);
    });

    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [currentStory, currentIndex, typeText, speakStory]);

  // Load voices (Chrome needs this async)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const bars = Array.from({ length: 9 });

  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Anchor avatar area */}
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

        {/* Anchor silhouette SVG */}
        <svg
          width="160"
          height="220"
          viewBox="0 0 160 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
          style={{
            filter: isSpeaking
              ? 'drop-shadow(0 0 12px #3a8eff) drop-shadow(0 0 24px rgba(58,142,255,0.4))'
              : 'drop-shadow(0 0 4px rgba(58,142,255,0.3))',
            transition: 'filter 0.3s ease',
          }}
        >
          {/* Body / desk */}
          <rect x="20" y="160" width="120" height="60" rx="4" fill="#1a3a6b" opacity="0.9" />
          <rect x="30" y="165" width="100" height="8" rx="2" fill="#2a5a9b" opacity="0.6" />
          {/* Desk logo */}
          <text x="80" y="196" textAnchor="middle" fill="#3a8eff" fontSize="10" fontWeight="bold" fontFamily="monospace">$CNN</text>

          {/* Torso */}
          <rect x="42" y="120" width="76" height="50" rx="8" fill="#1a3a6b" />
          {/* Tie */}
          <polygon points="80,122 87,122 84,158 76,158" fill="#CC0000" />
          <polygon points="80,122 86,126 80,132 74,126" fill="#aa0000" />
          {/* Shirt collar */}
          <polygon points="67,120 80,130 80,120" fill="white" opacity="0.9" />
          <polygon points="93,120 80,130 80,120" fill="white" opacity="0.85" />

          {/* Neck */}
          <rect x="70" y="105" width="20" height="20" rx="6" fill="#c8a882" />

          {/* Head */}
          <ellipse cx="80" cy="88" rx="32" ry="34" fill="#c8a882" />

          {/* Robot/AI elements on head */}
          <circle cx="80" cy="88" r="32" fill="none" stroke="#3a8eff" strokeWidth="1.5" opacity="0.4" />
          {/* Circuit lines */}
          <line x1="48" y1="88" x2="55" y2="88" stroke="#3a8eff" strokeWidth="1" opacity="0.6" />
          <line x1="105" y1="88" x2="112" y2="88" stroke="#3a8eff" strokeWidth="1" opacity="0.6" />
          <line x1="80" y1="56" x2="80" y2="62" stroke="#3a8eff" strokeWidth="1" opacity="0.6" />

          {/* Eyes */}
          <ellipse cx="68" cy="84" rx="7" ry="6" fill="#0A1628" />
          <ellipse cx="92" cy="84" rx="7" ry="6" fill="#0A1628" />
          {/* Eye glow */}
          <ellipse
            cx="68" cy="84" rx="5" ry="4"
            fill={isSpeaking ? '#3a8eff' : '#1a5abf'}
            style={{ animation: isSpeaking ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
          />
          <ellipse
            cx="92" cy="84" rx="5" ry="4"
            fill={isSpeaking ? '#3a8eff' : '#1a5abf'}
            style={{ animation: isSpeaking ? 'eye-pulse 0.8s ease-in-out infinite alternate' : undefined }}
          />
          {/* Eye shine */}
          <circle cx="70" cy="82" r="1.5" fill="white" opacity="0.8" />
          <circle cx="94" cy="82" r="1.5" fill="white" opacity="0.8" />

          {/* Nose */}
          <ellipse cx="80" cy="91" rx="3" ry="2" fill="#b08060" />

          {/* Mouth — animated when speaking */}
          {isSpeaking ? (
            <>
              <ellipse cx="80" cy="99" rx="9" ry="5" fill="#0A1628" />
              <ellipse cx="80" cy="99" rx="7" ry="3" fill="#1a1a2e" />
            </>
          ) : (
            <path d="M71 99 Q80 104 89 99" stroke="#b08060" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}

          {/* Hair */}
          <ellipse cx="80" cy="60" rx="30" ry="14" fill="#3a2a1a" />
          <rect x="50" y="58" width="60" height="12" rx="2" fill="#3a2a1a" />

          {/* Ears */}
          <ellipse cx="48" cy="88" rx="5" ry="7" fill="#c8a882" />
          <ellipse cx="112" cy="88" rx="5" ry="7" fill="#c8a882" />

          {/* Earpiece (AI anchor detail) */}
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
                backgroundColor: barsActive ? '#3a8eff' : '#1a3a6b',
                height: barsActive ? undefined : 4,
                minHeight: 4,
                maxHeight: 36,
                animation: barsActive
                  ? `wave-bar ${0.4 + i * 0.07}s ease-in-out infinite alternate`
                  : undefined,
                animationDelay: `${i * 0.06}s`,
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-2 flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: isSpeaking ? '#00ff88' : '#666',
            boxShadow: isSpeaking ? '0 0 6px #00ff88' : 'none',
            animation: isSpeaking ? 'status-pulse 0.6s ease-in-out infinite alternate' : undefined,
          }}
        />
        <span className="text-xs font-mono text-blue-300">
          {isTyping ? 'PROCESSING...' : isSpeaking ? 'ON AIR' : 'STANDBY'}
        </span>
      </div>

      {/* Headline display */}
      <div className="mt-4 w-full rounded border border-blue-800/40 bg-[#0d1f3c] p-4 min-h-[80px]">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-[#CC0000] px-2 py-0.5 text-[10px] font-black text-white tracking-widest">
            REPORTING
          </span>
          {currentStory && (
            <span className="text-[10px] text-blue-400 font-mono uppercase">{currentStory.source}</span>
          )}
        </div>
        <p className="text-white font-semibold leading-snug text-sm min-h-[40px]">
          {displayText}
          {isTyping && <span className="ml-0.5 inline-block w-0.5 h-4 bg-blue-400 animate-pulse align-middle" />}
        </p>
      </div>

      {/* Story summary */}
      {currentStory && !isTyping && (
        <div className="mt-3 w-full rounded bg-[#0d1f3c]/60 p-3 border border-blue-900/30">
          <p className="text-blue-200/70 text-xs leading-relaxed">{currentStory.summary}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between w-full">
        <button
          onClick={onNext}
          className="rounded border border-blue-700 bg-[#0d1f3c] px-4 py-1.5 text-xs text-blue-300 hover:bg-blue-800/30 transition-colors font-mono tracking-wider"
        >
          NEXT STORY →
        </button>
        <span className="text-[10px] text-blue-500 font-mono">
          {currentIndex + 1} / {stories.length}
        </span>
      </div>
    </div>
  );
}
