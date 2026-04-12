import { NextRequest } from 'next/server';
import type { NewsItem } from '../../types';
import { BrainEngine } from '../brain/engine';

export type { NewsItem };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Global State ──────────────────────────────────────────────────────────────

type ClientController = ReadableStreamDefaultController<Uint8Array>;

declare global {
  // eslint-disable-next-line no-var
  var __cnn_clients: Set<ClientController> | undefined;
  // eslint-disable-next-line no-var
  var __cnn_brainRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __cnn_brain: BrainEngine | undefined;
  // eslint-disable-next-line no-var
  var __cnn_audio: Map<string, { buf: Buffer; ts: number }> | undefined;
  // eslint-disable-next-line no-var
  var __cnn_broadcastStartedAt: number | undefined;
}

if (!global.__cnn_clients) global.__cnn_clients = new Set();
if (!global.__cnn_audio) global.__cnn_audio = new Map();
if (!global.__cnn_broadcastStartedAt) global.__cnn_broadcastStartedAt = Date.now();

function clients(): Set<ClientController> { return global.__cnn_clients!; }
function audioCache(): Map<string, { buf: Buffer; ts: number }> { return global.__cnn_audio!; }

// ─── SSE Helpers ───────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function sendToClient(ctrl: ClientController, data: object) {
  try {
    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch { /* client gone */ }
}

function broadcastToAll(data: object) {
  for (const ctrl of clients()) sendToClient(ctrl, data);
}

function broadcastViewerCount() {
  const count = clients().size;
  broadcastToAll({ type: 'viewer-count', count });
}

// ─── TTS Generation ────────────────────────────────────────────────────────────

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

  // Evict entries older than 15 minutes
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [k, v] of cache) {
    if (v.ts < cutoff) cache.delete(k);
  }

  // OpenAI TTS onyx speaks at roughly 13 chars/sec
  const durationMs = Math.max(8000, (text.length / 13) * 1000);
  return { id, durationMs };
}

// ─── Brain Startup ─────────────────────────────────────────────────────────────

function startBrain() {
  if (global.__cnn_brainRunning) return;
  global.__cnn_brainRunning = true;

  const brain = new BrainEngine({
    broadcast: broadcastToAll,
    generateTTS,
  });

  global.__cnn_brain = brain;
  brain.start();
}

// ─── SSE Route Handler ─────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const cls = clients();
  let clientCtrl: ClientController;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      clientCtrl = ctrl;
      cls.add(ctrl);

      // Start the brain if not already running
      startBrain();

      const brain = global.__cnn_brain;
      const brainState = brain?.getCurrentState();

      // Send current state to the new client
      sendToClient(ctrl, {
        type: 'state',
        // Brain state fields
        brainState: brainState?.brainState ?? 'SCANNING',
        anchorText: brainState?.anchorText ?? '',
        audioId: brainState?.audioId ?? '',
        story: brainState?.currentStory ?? null,
        // Snapshot fields expected by existing UI
        currentIndex: brainState?.storyCount ?? 0,
        startedAt: Date.now(),
        broadcastStartedAt: global.__cnn_broadcastStartedAt,
        totalStories: brainState?.stories.length ?? 0,
        stories: brainState?.stories ?? [],
        viewerCount: cls.size,
        totalAnalyzed: brainState?.totalAnalyzed ?? 0,
        storyCount: brainState?.storyCount ?? 0,
        sourceCount: brainState?.sourceCount ?? 5,
        analysis: null,
        scannerStatus: brainState?.scannerStatus ?? { scanning: false, lastScan: 0, sourcesChecked: [] },
        queueSize: brainState?.queueSize ?? 0,
      });

      broadcastViewerCount();

      // Keepalive ping
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
