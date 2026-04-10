import { NextResponse } from 'next/server';

// Re-export the shared type so components can still import it from here
export type { NewsItem } from '../broadcast/route';

// This route now just proxies from the broadcast global cache so that
// any direct fetch to /api/news still works (e.g. for SEO/debug).
// The primary data path is SSE via /api/broadcast.
export async function GET() {
  // Access the global broadcast state if the director has started
  const s = (global as Record<string, unknown>).__cnn_state as
    | { stories: unknown[]; lastFetchAt: number }
    | undefined;

  if (s && s.stories.length > 0) {
    return NextResponse.json({ stories: s.stories, sources: 5 });
  }

  // Director not started yet — return empty so the SSE path is used
  return NextResponse.json({ stories: [], sources: 5 });
}
