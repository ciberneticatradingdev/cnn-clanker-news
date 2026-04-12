import { NextResponse } from 'next/server';

export type { NewsItem } from '../../types';

// This route proxies from the broadcast global cache so that
// any direct fetch to /api/news still works (e.g. for SEO/debug).
// The primary data path is SSE via /api/broadcast.
export async function GET() {
  const s = (global as Record<string, unknown>).__cnn_state as
    | { stories: unknown[]; lastFetchAt: number }
    | undefined;

  if (s && s.stories.length > 0) {
    return NextResponse.json({ stories: s.stories, sources: 5 });
  }

  return NextResponse.json({ stories: [], sources: 5 });
}
