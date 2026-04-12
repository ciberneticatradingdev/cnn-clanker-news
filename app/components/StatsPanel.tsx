'use client';

import { useEffect, useState } from 'react';

interface StatsPanelProps {
  storyCount: number;    // total stories loaded
  sourcesActive: number; // number of live RSS sources
  totalAnalyzed: number; // number of AI analyses completed this session
  startedAt: number;     // client session start timestamp
}

export default function StatsPanel({ storyCount, sourcesActive, totalAnalyzed, startedAt }: StatsPanelProps) {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    function tick() {
      setUptime(Math.floor((Date.now() - startedAt) / 1000));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  function formatUptime(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  const stats = [
    { label: 'Stories Loaded', value: storyCount.toString(), color: '#3a8eff', icon: '📡' },
    { label: 'Sources Active', value: sourcesActive.toString(), color: '#00ff88', icon: '🔴' },
    { label: 'AI Analyses', value: totalAnalyzed.toString(), color: '#a855f7', icon: '🤖' },
    { label: 'Uptime', value: formatUptime(uptime), color: '#f59e0b', icon: '⏱' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="rounded border bg-[#0d1f3c] p-3 text-center"
          style={{ borderColor: `${stat.color}33` }}
        >
          <div className="text-lg mb-0.5">{stat.icon}</div>
          <div className="font-mono text-lg font-black leading-none tracking-tight" style={{ color: stat.color }}>
            {stat.value}
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
