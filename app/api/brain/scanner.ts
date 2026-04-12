import type { NewsItem } from '../../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScoredStory extends NewsItem {
  score: number;
  aiSummary: string;
}

export interface ScannerStatus {
  scanning: boolean;
  lastScan: number;
  sourcesChecked: string[];
}

// ─── Feed Config ───────────────────────────────────────────────────────────────

const SCANNER_FEEDS = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', category: 'Crypto' },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', category: 'Crypto' },
  { url: 'https://decrypt.co/feed', name: 'Decrypt', category: 'Web3' },
  { url: 'https://www.theblock.co/rss.xml', name: 'The Block', category: 'DeFi' },
  { url: 'https://www.bankless.com/rss.xml', name: 'Bankless', category: 'DeFi' },
];

// ─── RSS Fetching ───────────────────────────────────────────────────────────────

async function fetchFeedItems(feed: typeof SCANNER_FEEDS[0]): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CNNBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, */*',
      },
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) return [];

    const text = await res.text();
    const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || [];
    const items: NewsItem[] = [];

    for (const xml of itemMatches.slice(0, 8)) {
      const titleM = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const descM = xml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const linkM = xml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const dateM = xml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

      const title = titleM?.[1]
        ?.replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, '')
        .trim();
      if (!title || title.length < 5) continue;

      const rawDesc = descM?.[1] || '';
      const summary = rawDesc
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, '')
        .replace(/\s+/g, ' ').trim().slice(0, 220) || 'Developing story.';

      const link = linkM?.[1]?.trim() || '';
      const pubDate = dateM?.[1]?.trim() || new Date().toISOString();

      items.push({
        id: `${feed.name}-${Buffer.from(title).toString('base64').slice(0, 12)}`,
        title,
        summary,
        source: feed.name,
        category: feed.category,
        timestamp: (() => { try { return new Date(pubDate).toISOString(); } catch { return new Date().toISOString(); } })(),
        link,
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ─── Groq Story Evaluation ─────────────────────────────────────────────────────

async function evaluateStory(item: NewsItem): Promise<{ score: number; aiSummary: string }> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are a news editor for a crypto broadcast network. Evaluate how newsworthy this story is for a crypto audience. Score 8-10 for major breaking news: big price moves, regulatory decisions, major hacks, protocol launches, whale activity. Score 5-7 for significant but routine news. Score 1-4 for minor updates. Also write a punchy 1-sentence AI summary. Respond ONLY with valid JSON: {"score": number, "aiSummary": "string"}',
          },
          {
            role: 'user',
            content: `Title: ${item.title}\nSource: ${item.source}\nSummary: ${item.summary}`,
          },
        ],
        max_tokens: 120,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return { score: 5, aiSummary: '' };
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { score: 5, aiSummary: '' };

    let parsed: { score?: unknown; aiSummary?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { score: 5, aiSummary: '' };
    }

    return {
      score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
      aiSummary: String(parsed.aiSummary || ''),
    };
  } catch {
    return { score: 5, aiSummary: '' };
  }
}

// ─── Scanner Class ─────────────────────────────────────────────────────────────

export class Scanner {
  private seenTitles = new Set<string>();
  private onStory: ((story: ScoredStory) => void) | null = null;
  private onStatus: ((status: ScannerStatus) => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  public isScanning = false;
  public lastScanAt = 0;
  public sourcesChecked: string[] = [];
  public readonly feedNames = SCANNER_FEEDS.map(f => f.name);

  start(
    onStory: (story: ScoredStory) => void,
    onStatus: (status: ScannerStatus) => void,
  ) {
    this.onStory = onStory;
    this.onStatus = onStatus;
    void this.runScan();
    this.timer = setInterval(() => void this.runScan(), 2 * 60 * 1000);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async runScan() {
    if (this.isScanning) return;
    this.isScanning = true;
    this.lastScanAt = Date.now();
    this.sourcesChecked = [];

    this.onStatus?.({ scanning: true, lastScan: this.lastScanAt, sourcesChecked: [] });

    try {
      const results = await Promise.allSettled(SCANNER_FEEDS.map(f => fetchFeedItems(f)));
      const toEvaluate: NewsItem[] = [];

      for (let i = 0; i < SCANNER_FEEDS.length; i++) {
        const r = results[i];
        if (r.status !== 'fulfilled') continue;
        this.sourcesChecked.push(SCANNER_FEEDS[i].name);

        for (const item of r.value) {
          const key = item.title.toLowerCase().slice(0, 60);
          if (this.seenTitles.has(key)) continue;
          this.seenTitles.add(key);
          toEvaluate.push(item);
        }
      }

      // Evaluate up to 12 new items per scan to stay within rate limits
      await Promise.allSettled(
        toEvaluate.slice(0, 12).map(item => this.evaluateAndEmit(item))
      );
    } catch (e) {
      console.error('[Scanner] runScan error:', e);
    }

    this.isScanning = false;
    this.onStatus?.({
      scanning: false,
      lastScan: this.lastScanAt,
      sourcesChecked: this.sourcesChecked,
    });
  }

  private async evaluateAndEmit(item: NewsItem) {
    try {
      const { score, aiSummary } = await evaluateStory(item);
      this.onStory?.({
        ...item,
        score,
        aiSummary,
        isBreaking: score >= 8,
      });
    } catch (e) {
      console.error('[Scanner] evaluateAndEmit error:', e);
    }
  }
}
