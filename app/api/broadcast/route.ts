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
  broadcastStartedAt: number;
  viewerCount: number;
  totalAnalyzed: number;
  lastFetchAt: number;
  storyCount: number;
  analysis: string;
  audioId: string;
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
  // eslint-disable-next-line no-var
  var __cnn_audio: Map<string, { buf: Buffer; ts: number }> | undefined;
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
    analysis: '',
    audioId: '',
  };
}
if (!global.__cnn_clients) {
  global.__cnn_clients = new Set();
}
if (!global.__cnn_audio) {
  global.__cnn_audio = new Map();
}

function state(): BroadcastState { return global.__cnn_state!; }
function clients(): Set<ClientController> { return global.__cnn_clients!; }
function audioCache(): Map<string, { buf: Buffer; ts: number }> { return global.__cnn_audio!; }

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

  fresh.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const seen = new Set<string>();
  fresh = fresh.filter(st => {
    const key = st.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  fresh = fresh.slice(0, 30);

  const newBreaking: NewsItem[] = [];
  const marked = fresh.map(st => {
    const isBreaking = !oldIds.has(st.id) && oldIds.size > 0;
    if (isBreaking) newBreaking.push(st);
    return { ...st, isBreaking };
  });

  s.stories = marked;
  s.totalAnalyzed += newBreaking.length;
  s.lastFetchAt = Date.now();

  broadcast({ type: 'ticker', stories: marked.slice(0, 20) });

  for (const story of newBreaking.slice(0, 1)) {
    broadcast({ type: 'breaking', story });
  }
}

// ─── AI Analysis (Groq) ───────────────────────────────────────────────────────

async function getAIAnalysis(story: NewsItem): Promise<string> {
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
              'You are a professional AI news anchor for Clanker News Network. Given a headline and summary, provide a brief 2-3 sentence analysis. Be insightful, professional, slightly dramatic like a real CNN anchor. Use phrases like: According to our sources, Our analysis suggests, This is a developing story, Significant implications for... 2-3 sentences max.',
          },
          {
            role: 'user',
            content: `Headline: ${story.title}\nSource: ${story.source}\nSummary: ${story.summary}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    if (!res.ok) { console.error('Groq error:', res.status); return ''; }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (e) {
    console.error('Groq failed:', e);
    return '';
  }
}

// ─── TTS (OpenAI) ─────────────────────────────────────────────────────────────

const TTS_TRANSITIONS = [
  'Moving on to our next story. ',
  'In other news. ',
  'Developing story. ',
  'Sources are reporting. ',
  'Our correspondents have confirmed. ',
  'Turning now to another developing story. ',
];

const TTS_STATION_IDS = [
  'You are watching the Clanker News Network. Stay with us. ',
  'This is CNN — the Clanker News Network. We continue our coverage. ',
  'We appreciate you tuning in to the Clanker News Network. ',
];

function buildTTSText(story: NewsItem, analysis: string, storyCount: number): string {
  const isFirst = storyCount <= 1;

  let prefix = '';
  if (isFirst) {
    prefix = 'Good evening. This is the Clanker News Network. I am your AI anchor. Let us begin. ';
  } else if (storyCount % 5 === 0) {
    prefix = TTS_STATION_IDS[(storyCount / 5) % TTS_STATION_IDS.length];
  } else {
    prefix = TTS_TRANSITIONS[(storyCount - 1) % TTS_TRANSITIONS.length];
  }

  const isBreaking = story.isBreaking ? 'Breaking news. ' : '';
  const source = `From ${story.source}. `;
  const headline = `${story.title}. `;
  const summary = story.summary && story.summary !== 'Read the full story.' ? `${story.summary}. ` : '';
  const aiPart = analysis ? `${analysis} ` : '';
  const sign = 'This is Clanker, reporting live.';

  return prefix + isBreaking + source + headline + summary + aiPart + sign;
}

async function generateTTS(text: string): Promise<{ id: string; durationMs: number }> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: 'onyx' }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS failed ${res.status}: ${errText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const id = crypto.randomUUID();

  const cache = audioCache();
  cache.set(id, { buf, ts: Date.now() });

  // Evict entries older than 10 minutes
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of cache) {
    if (v.ts < cutoff) cache.delete(k);
  }

  // OpenAI TTS onyx speaks at roughly 13 chars/sec
  const durationMs = Math.max(15000, (text.length / 13) * 1000);
  return { id, durationMs };
}

// ─── Broadcast Director (async loop) ─────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function currentStory(): NewsItem | null {
  const s = state();
  return s.stories[s.currentIndex] ?? null;
}

async function runDirectorLoop() {
  while (true) {
    const s = state();

    if (s.stories.length === 0) {
      await sleep(2000);
      continue;
    }

    const story = currentStory()!;

    // 1. Signal AI is thinking
    broadcast({ type: 'thinking', storyId: story.id });

    // 2. Get Groq analysis
    const analysis = await getAIAnalysis(story);

    // 3. Build TTS narration
    const ttsText = buildTTSText(story, analysis, s.storyCount);

    // 4. Generate TTS audio
    let audioId = '';
    let durationMs = 45000;
    try {
      const tts = await generateTTS(ttsText);
      audioId = tts.id;
      durationMs = tts.durationMs;
    } catch (e) {
      console.error('TTS generation failed:', e);
      // Use estimated duration based on text length even without audio
      durationMs = Math.max(20000, (ttsText.length / 13) * 1000);
    }

    // 5. Store in state
    s.analysis = analysis;
    s.audioId = audioId;

    // 6. Push story + analysis + audioId to all clients
    broadcast({
      type: 'story-change',
      story,
      currentIndex: s.currentIndex,
      startedAt: s.startedAt,
      totalStories: s.stories.length,
      storyCount: s.storyCount,
      analysis,
      audioId,
    });

    // 7. Wait for audio duration + 5s pause
    await sleep(durationMs + 5000);

    // 8. Advance
    s.currentIndex = (s.currentIndex + 1) % s.stories.length;
    s.startedAt = Date.now();
    s.storyCount += 1;

    // 9. Refresh news if stale
    if (Date.now() - s.lastFetchAt > 5 * 60 * 1000) {
      fetchAllNews().catch(e => console.error('fetchAllNews error:', e));
    }
  }
}

async function startDirector() {
  if (global.__cnn_directorRunning) return;
  global.__cnn_directorRunning = true;

  await fetchAllNews();

  const s = state();
  s.currentIndex = 0;
  s.startedAt = Date.now();
  s.storyCount = 1;

  runDirectorLoop().catch(e => {
    console.error('Director loop crashed:', e);
    global.__cnn_directorRunning = false;
  });
}

// ─── SSE Route Handler ────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const cls = clients();
  let clientCtrl: ClientController;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      clientCtrl = ctrl;
      cls.add(ctrl);

      startDirector();

      const s = state();

      send(ctrl, {
        type: 'state',
        story: currentStory(),
        currentIndex: s.currentIndex,
        startedAt: s.startedAt,
        broadcastStartedAt: s.broadcastStartedAt,
        totalStories: s.stories.length,
        stories: s.stories.slice(0, 30),
        viewerCount: cls.size,
        totalAnalyzed: s.totalAnalyzed,
        storyCount: s.storyCount,
        sourceCount: FEEDS.length,
        analysis: s.analysis,
        audioId: s.audioId,
      });

      broadcastViewerCount();

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
