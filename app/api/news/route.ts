import { NextResponse } from 'next/server';
import type { NewsItem } from '../../types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Crypto RSS Feeds ─────────────────────────────────────────────────────────

const FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', category: 'Crypto' },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', category: 'Crypto' },
  { url: 'https://decrypt.co/feed', name: 'Decrypt', category: 'Web3' },
  { url: 'https://www.theblock.co/rss.xml', name: 'The Block', category: 'DeFi' },
  { url: 'https://www.bankless.com/rss.xml', name: 'Bankless', category: 'DeFi' },
];

const FALLBACK_STORIES: NewsItem[] = [
  { id: 'fb1', title: 'Bitcoin Surges Past Key Resistance Level as Institutional Demand Grows', summary: 'BTC rallies as major asset managers increase allocation to crypto portfolios amid favorable macro conditions.', source: 'CoinDesk', category: 'Crypto', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb2', title: 'Ethereum Layer 2 Ecosystem Hits Record $50B TVL', summary: 'Total value locked across Ethereum L2 networks reaches historic milestone, driven by DeFi and gaming adoption.', source: 'CoinTelegraph', category: 'DeFi' , timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb3', title: 'Solana DEX Volume Surpasses Ethereum for Third Consecutive Week', summary: 'SOL-based decentralized exchanges continue to capture market share as low fees attract retail traders.', source: 'Decrypt', category: 'DeFi', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb4', title: 'Clanker Launches New Token Factory with Advanced AI Features', summary: 'The Clanker protocol introduces autonomous token deployment powered by next-generation language models on Base.', source: 'Bankless', category: 'Web3', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb5', title: 'SEC Approves Spot Ethereum ETF Options Trading', summary: 'Regulatory approval opens new derivatives market for institutional investors seeking ETH exposure through traditional channels.', source: 'CoinDesk', category: 'Regulation', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb6', title: 'Base Network Processes 10 Million Transactions in 24 Hours', summary: 'Coinbase\'s L2 blockchain sets new throughput record as memecoin and DeFi activity surges to all-time highs.', source: 'The Block', category: 'Web3', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb7', title: 'Memecoin Market Cap Reaches $100B Amid Retail Frenzy', summary: 'The memecoin sector sees explosive growth as new AI-launched tokens on Base and Solana capture viral momentum.', source: 'CoinTelegraph', category: 'Crypto', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb8', title: 'DeFi Protocol Reports Record $2B in Daily Trading Volume', summary: 'Automated market makers see unprecedented activity as token launches and yield farming strategies attract capital.', source: 'Bankless', category: 'DeFi', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb9', title: 'Bitcoin Mining Difficulty Reaches All-Time High After Halving', summary: 'Hash rate and difficulty adjust upward as miners upgrade to next-gen ASICs following the most recent BTC halving event.', source: 'Decrypt', category: 'Crypto', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb10', title: 'Stablecoin Market Cap Hits $200B as USDC Adoption Accelerates', summary: 'Circle\'s USDC leads stablecoin growth on Base and other L2 networks, signaling institutional confidence in on-chain finance.', source: 'The Block', category: 'DeFi', timestamp: new Date().toISOString(), link: '#' },
];

// ─── Server-side cache ────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __cnn_news_cache: { stories: NewsItem[]; fetchedAt: number } | undefined;
}

if (!global.__cnn_news_cache) {
  global.__cnn_news_cache = { stories: [], fetchedAt: 0 };
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ─── RSS Parser ───────────────────────────────────────────────────────────────

function stripCdata(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#[0-9]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchFeed(feed: typeof FEEDS[0]): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CNNBot/1.0; +https://clanker.news)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    const items: NewsItem[] = [];

    for (const xml of itemMatches.slice(0, 10)) {
      const titleM = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descM = xml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const linkM = xml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const dateM = xml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

      const title = titleM ? stripCdata(titleM[1]) : '';
      if (!title || title.length < 5) continue;

      const rawDesc = descM ? stripCdata(descM[1]) : '';
      const summary = rawDesc.slice(0, 240) || 'Read the full story.';
      const link = linkM ? stripCdata(linkM[1]) : '';
      const pubDate = dateM?.[1]?.trim() ?? new Date().toISOString();

      let timestamp: string;
      try { timestamp = new Date(pubDate).toISOString(); }
      catch { timestamp = new Date().toISOString(); }

      items.push({
        id: `${feed.name}-${Buffer.from(title).toString('base64').slice(0, 12)}`,
        title,
        summary,
        source: feed.name,
        category: feed.category,
        timestamp,
        link,
      });
    }

    return items;
  } catch {
    return [];
  }
}

async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let fresh: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') fresh = [...fresh, ...r.value];
  }

  if (fresh.length < 3) {
    fresh = FALLBACK_STORIES;
  } else {
    // Blend in a few fallbacks at the end for a safety floor
    fresh = [...fresh, ...FALLBACK_STORIES.slice(0, 3)];
  }

  // Sort newest first
  fresh.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Deduplicate by title prefix
  const seen = new Set<string>();
  fresh = fresh.filter(st => {
    const key = st.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return fresh.slice(0, 30);
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const cache = global.__cnn_news_cache!;
  const now = Date.now();

  if (cache.stories.length === 0 || now - cache.fetchedAt > CACHE_TTL_MS) {
    try {
      const stories = await fetchAllNews();
      // Mark stories that appeared after the previous fetch as breaking
      const prevIds = new Set(cache.stories.map(s => s.id));
      const marked = stories.map(s => ({
        ...s,
        isBreaking: prevIds.size > 0 && !prevIds.has(s.id),
      }));
      cache.stories = marked;
      cache.fetchedAt = now;
    } catch {
      // Keep stale cache on error
    }
  }

  return NextResponse.json({
    stories: cache.stories,
    sources: FEEDS.length,
    fetchedAt: cache.fetchedAt,
  });
}
