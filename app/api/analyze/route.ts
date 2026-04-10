import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { headline, summary, source } = await req.json();

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
              'You are a professional AI news anchor for Clanker News Network. Given a headline and summary, provide a brief 2-3 sentence analysis. Be insightful, professional, slightly dramatic like a real CNN anchor. Use phrases like: According to our sources, Our analysis suggests, This is a developing story, Significant implications for... Keep it to 2-3 sentences maximum.',
          },
          {
            role: 'user',
            content: `Headline: ${headline}\nSource: ${source}\nSummary: ${summary}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Groq error:', err);
      return NextResponse.json({ analysis: '' });
    }

    const data = await res.json();
    const analysis = data.choices?.[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error('Groq fetch failed:', e);
    return NextResponse.json({ analysis: '' });
  }
}
