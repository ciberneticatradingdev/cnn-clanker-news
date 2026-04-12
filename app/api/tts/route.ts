import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Audio cache is shared via the global defined in broadcast/route.ts
declare global {
  // eslint-disable-next-line no-var
  var __cnn_audio: Map<string, { buf: Buffer; ts: number }> | undefined;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  const cache = global.__cnn_audio;
  if (!cache) return new Response('Not found', { status: 404 });

  const entry = cache.get(id);
  if (!entry) return new Response('Not found', { status: 404 });

  return new Response(entry.buf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': entry.buf.length.toString(),
      'Cache-Control': 'public, max-age=600',
    },
  });
}
