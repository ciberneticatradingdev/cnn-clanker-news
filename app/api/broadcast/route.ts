import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  timestamp: string;
  link: string;
  isBreaking?: boolean;
}

interface BroadcastState {
  stories: NewsItem[];
  currentIndex: number;
  startedAt: number;
  broadcastStartedAt: number; // global broadcast start — never changes
  viewerCount: number;
  totalAnalyzed: number;
  lastFetchAt: number;
  storyCount: number; // total read since launch
}

type ClientController = ReadableStreamDefaultController<Uint8Array>;

// ─── Global State ─────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __cnn_state: BroadcastState | undefined;
  // eslint-disable-next-line no-var
  var __cnn_clients: Set<ClientController> | undefined;
  // eslint-disable-next-line no-var
  var __cnn_directorRunning: boolean | undefined;
}

if (!global.__cnn_state) {
  global.__cnn_state = {
    stories: [],
    currentIndex: 0,
    startedAt: Date.now(),
    broadcastStartedAt: Date.now(),
    viewerCount: 0,
    totalAnalyzed: 0,
    lastFetchAt: 0,
    storyCount: 0,
  };
}
if (!global.__cnn_clients) {
  global.__cnn_clients = new Set();
}

function state(): BroadcastState { return global.__cnn_state!; }
function clients(): Set<ClientController> { return global.__cnn_clients!; }

// ─── SSE Helpers ──────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function send(ctrl: ClientController, data: object) {
  try {
    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch { /* client gone */ }
}

function broadcast(data: object) {
  for (const ctrl of clients()) send(ctrl, data);
}

function broadcastViewerCount() {
  const count = clients().size;
  state().viewerCount = count;
  broadcast({ type: 'viewer-count', count });
}

// ─── RSS Fetching ─────────────────────────────────────────────────────────────

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC News', category: 'World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times', category: 'World' },
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters', category: 'Business' },
  { url: 'http://feeds.aljazeera.net/aljazeera/english', name: 'Al Jazeera', category: 'Politics' },
  { url: 'https://news.google.com/rss', name: 'Google News', category: 'Tech' },
];

const FALLBACK_STORIES: NewsItem[] = [
  { id: 'fb1', title: 'Global Markets Rally Amid Economic Optimism', summary: 'World markets surge as economic indicators point to strong growth in major economies.', source: 'CNN', category: 'Business', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb2', title: 'Technology Sector Sees Record Investment in AI Infrastructure', summary: 'Venture capital pours billions into artificial intelligence startups worldwide.', source: 'Reuters', category: 'Tech', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb3', title: 'International Climate Summit Reaches New Agreement', summary: 'World leaders commit to ambitious carbon reduction targets at landmark summit.', source: 'BBC News', category: 'World', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb4', title: 'Central Banks Signal Shift in Monetary Policy', summary: 'Federal Reserve and ECB indicate potential rate adjustments in coming quarters.', source: 'NY Times', category: 'Business', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb5', title: 'Breakthrough in Quantum Computing Announced', summary: 'Scientists achieve major milestone in quantum processing capabilities.', source: 'Al Jazeera', category: 'Tech', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb6', title: 'Diplomatic Talks Resume Between Major Powers', summary: 'High-level negotiations aim to ease tensions and foster cooperation.', source: 'Reuters', category: 'Politics', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb7', title: 'Supply Chain Resilience Strengthened Globally', summary: 'Nations invest in diversified supply networks to prevent future disruptions.', source: 'BBC News', category: 'Business', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb8', title: 'Space Exploration Agency Announces New Mission', summary: 'Multinational team prepares for ambitious deep space exploration program.', source: 'NY Times', category: 'Tech', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb9', title: 'Healthcare Innovation Drives Global Wellness Improvements', summary: 'New medical technologies improve outcomes for millions of patients worldwide.', source: 'Al Jazeera', category: 'World', timestamp: new Date().toISOString(), link: '#' },
  { id: 'fb10', title: 'Renewable Energy Investment Hits Historic High', summary: 'Solar and wind projects receive unprecedented funding from public and private sectors.', source: 'Reuters', category: 'Business', timestamp: new Date().toISOString(), link: '#' },
];

async function fetchFeed(feed: typeof FEEDS[0]): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CNNBot/1.0)', 'Accept': 'application/rss+xml, application/xml, */*' },
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || [];
    const items: NewsItem[] = [];
    for (const xml of itemMatches.slice(0, 8)) {
      const titleM = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const descM = xml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const linkM = xml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const dateM = xml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const title = titleM?.[1]?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, '').trim();
      if (!title || title.length < 5) continue;
      const rawDesc = descM?.[1] || '';
      const summary = rawDesc.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, '').replace(/\s+/g, ' ').trim().slice(0, 220) || 'Read the full story.';
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

async function fetchAllNews() {
  const s = state();
  const oldIds = new Set(s.stories.map(st => st.id));

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  let fresh: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') fresh = [...fresh, ...r.value];
  }

  if (fresh.length < 3) fresh = FALLBACK_STORIES;
  else fresh = [...fresh, ...FALLBACK_STORIES.slice(0, 3)];

  // Sort by recency
  fresh.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Deduplicate
  const seen = new Set<string>();
  fresh = fresh.filter(st => {
    const key = st.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  fresh = fresh.slice(0, 30);

  // Mark new stories as breaking
  const newBreaking: NewsItem[] = [];
  const marked = fresh.map(st => {
    const isBreaking = !oldIds.has(st.id) && oldIds.size > 0;
    if (isBreaking) newBreaking.push(st);
    return { ...st, isBreaking };
  });

  s.stories = marked;
  s.totalAnalyzed += newBreaking.length;
  s.lastFetchAt = Date.now();

  // Push ticker update
  broadcast({ type: 'ticker', stories: marked.slice(0, 20) });

  // Push breaking alerts for each new story
  for (const story of newBreaking.slice(0, 1)) {
    broadcast({ type: 'breaking', story });
  }
}

// ─── Broadcast Director ───────────────────────────────────────────────────────

function currentStory(): NewsItem | null {
  const s = state();
  return s.stories[s.currentIndex] ?? null;
}

function advanceStory() {
  const s = state();
  if (s.stories.length === 0) return;
  s.currentIndex = (s.currentIndex + 1) % s.stories.length;
  s.startedAt = Date.now();
  s.storyCount += 1;

  const story = currentStory();
  broadcast({
    type: 'story-change',
    story,
    currentIndex: s.currentIndex,
    startedAt: s.startedAt,
    totalStories: s.stories.length,
    storyCount: s.storyCount,
  });
}

function scheduleNext() {
  // Vary timing slightly 40-50s for natural feel
  const delay = 42000 + Math.random() * 8000;
  setTimeout(() => {
    advanceStory();
    scheduleNext();
  }, delay);
}

async function startDirector() {
  if (global.__cnn_directorRunning) return;
  global.__cnn_directorRunning = true;

  await fetchAllNews();

  const s = state();
  s.currentIndex = 0;
  s.startedAt = Date.now();
  s.storyCount = 1;

  scheduleNext();

  // Re-fetch every 5 minutes
  setInterval(fetchAllNews, 5 * 60 * 1000);
}

// ─── SSE Route Handler ────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const cls = clients();
  let clientCtrl: ClientController;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      clientCtrl = ctrl;
      cls.add(ctrl);

      // Kick off director (no-op if already running)
      startDirector();

      const s = state();

      // Send full initial state immediately
      send(ctrl, {
        type: 'state',
        story: currentStory(),
        currentIndex: s.currentIndex,
        startedAt: s.startedAt,
        broadcastStartedAt: s.broadcastStartedAt, // global broadcast start — survives client refresh
        totalStories: s.stories.length,
        stories: s.stories.slice(0, 30),
        viewerCount: cls.size,
        totalAnalyzed: s.totalAnalyzed,
        storyCount: s.storyCount,
        sourceCount: FEEDS.length,
      });

      // Notify everyone of viewer count change
      broadcastViewerCount();

      // Keep-alive ping every 25s
      const ping = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(ping);
        }
      }, 25000);
    },
    cancel() {
      cls.delete(clientCtrl);
      broadcastViewerCount();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
