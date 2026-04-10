'use client';

import { useEffect, useState } from 'react';

interface StatsPanelProps {
  storyCount: number;
  sourceCount: number;
}

export default function StatsPanel({ storyCount, sourceCount }: StatsPanelProps) {
  const [uptime, setUptime] = useState(0);
  const [analyzed, setAnalyzed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (storyCount === 0) return;
    // Animate counter up
    let current = 0;
    const target = storyCount * 1000 + Math.floor(Math.random() * 40000);
    const step = Math.ceil(target / 60);
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setAnalyzed(current);
      if (current >= target) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [storyCount]);

  // Increment analyzed counter slowly over time
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalyzed(prev => prev + Math.floor(Math.random() * 3 + 1));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  function formatUptime(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  const stats = [
    { label: 'Stories Analyzed', value: analyzed.toLocaleString(), color: '#3a8eff', icon: '📡' },
    { label: 'Sources Live', value: sourceCount.toString(), color: '#00ff88', icon: '🔴' },
    { label: 'Languages', value: '12', color: '#a855f7', icon: '🌐' },
    { label: 'AI Uptime', value: formatUptime(uptime), color: '#f59e0b', icon: '⏱' },
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
          <div
            className="font-mono text-lg font-black leading-none tracking-tight"
            style={{ color: stat.color }}
          >
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
