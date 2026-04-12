import type { ScoredStory } from './scanner';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BrainState = 'BREAKING' | 'REPORTING' | 'THINKING' | 'MONOLOGUE' | 'SCANNING';

export interface DialogueContext {
  state: BrainState;
  currentStory?: ScoredStory;
  recentlyCovered: ScoredStory[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildAnchorSystemPrompt(): string {
  return `You are Clanker, the AI news anchor for the Clanker News Network ($CNN). You are professional, authoritative, slightly dramatic, and deeply crypto-savvy. Your delivery style is like a seasoned TV news anchor — confident, measured, with gravitas and a hint of personality. You speak in complete sentences. You never say "I'm an AI" or break character. Keep responses under 4 sentences total. Do not use markdown formatting, bullet points, or headers — only plain spoken text.`;
}

function getRecentCoverageContext(covered: ScoredStory[]): string {
  if (covered.length === 0) return 'This is early in the broadcast with no prior coverage yet.';
  const titles = covered.slice(0, 5).map(s => `"${s.title}" (${s.source})`).join('; ');
  return `Recently covered: ${titles}.`;
}

// ─── Groq API Call ─────────────────────────────────────────────────────────────

async function callGroq(systemPrompt: string, userPrompt: string, maxTokens = 200): Promise<string | null> {
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.85,
      }),
    });
    if (!res.ok) {
      console.error('[Dialogue] Groq error:', res.status);
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error('[Dialogue] Groq call failed:', e);
    return null;
  }
}

// ─── Fallbacks ─────────────────────────────────────────────────────────────────

function getFallback(state: BrainState, ctx: DialogueContext): string {
  switch (state) {
    case 'SCANNING':
      return `Our AI systems are continuously monitoring the crypto feeds. We are scanning CoinDesk, CoinTelegraph, Decrypt, The Block, and Bankless. Stay with us — new developments are incoming.`;

    case 'THINKING': {
      const s = ctx.currentStory;
      if (!s) return 'What we are seeing here connects to broader trends in the crypto space. The market continues to evolve.';
      return `What is particularly interesting about this story from ${s.source} is its broader implications for the crypto market. The pattern we are tracking suggests continued volatility and opportunity for participants on both sides of this trade.`;
    }

    case 'MONOLOGUE':
      return `While we await fresh developments from our sources, let us reflect on what the market is telling us today. The crypto ecosystem continues to mature, with institutional and retail forces pulling in fascinating directions. This is precisely the kind of dynamic environment that Clanker News Network was built to cover.`;

    case 'BREAKING':
      return `Breaking news. We interrupt our coverage with an urgent development.`;

    case 'REPORTING':
      return `This development carries significant implications for the broader crypto market. Our analysis suggests this is a story worth watching closely as it develops.`;
  }
}

// ─── Main Dialogue Generator ───────────────────────────────────────────────────

export async function generateDialogue(ctx: DialogueContext): Promise<string> {
  const system = buildAnchorSystemPrompt();
  const recent = getRecentCoverageContext(ctx.recentlyCovered);

  let userPrompt = '';

  switch (ctx.state) {
    case 'SCANNING': {
      const greeting = getTimeGreeting();
      userPrompt = `Generate 2 sentences for the anchor while the system scans crypto news feeds. ${greeting.toLowerCase()} broadcast. Mention monitoring sources. Use phrases like "Our systems are scanning" or "Let me check what is developing". Sound professional and anticipatory.`;
      break;
    }

    case 'THINKING': {
      const s = ctx.currentStory;
      if (!s) {
        userPrompt = `Generate 2-3 sentences of thoughtful anchor commentary on current crypto market conditions. Connect ideas across DeFi, Bitcoin, regulation, or market sentiment. Start with a connecting phrase like "What is interesting here is" or "The pattern I am seeing". ${recent}`;
      } else {
        userPrompt = `You just reported on: "${s.title}" from ${s.source}. Generate 2-3 sentences of insightful anchor commentary connecting this to crypto trends or prior coverage. Start with phrases like "What is interesting here is..." or "Let me connect some dots..." or "The pattern I am tracking...". ${recent}`;
      }
      break;
    }

    case 'MONOLOGUE': {
      const topics = [
        'the current state of DeFi and on-chain activity',
        'Bitcoin\'s role as a macro asset and institutional adoption',
        'the memecoin cycle and what it tells us about retail sentiment',
        'Layer 2 scaling and what it means for Ethereum\'s future',
        'the intersection of crypto and geopolitics',
        'what separates signal from noise in crypto news coverage',
      ];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      userPrompt = `The news queue is currently empty. Generate 3-4 sentences of anchor monologue on: ${topic}. Sound like a seasoned TV anchor filling time intelligently. Use phrases like "While we await new developments..." or "Let me share some perspective on...". ${recent}`;
      break;
    }

    case 'BREAKING': {
      const s = ctx.currentStory;
      userPrompt = `Generate a 1-sentence urgent breaking news introduction for: "${s?.title ?? 'a major development'}". Start with "Breaking news." Be urgent and professional. Do not pad — just the intro line.`;
      break;
    }

    case 'REPORTING': {
      const s = ctx.currentStory;
      if (!s) return getFallback(ctx.state, ctx);
      userPrompt = `Generate a 2-3 sentence AI analysis for this crypto story. Title: "${s.title}". Source: ${s.source}. Summary: ${s.summary || s.aiSummary || 'No summary available.'}. Be insightful and professional, as if delivering live TV analysis. Focus on market implications.`;
      break;
    }
  }

  const result = await callGroq(system, userPrompt, 220);
  return result ?? getFallback(ctx.state, ctx);
}
