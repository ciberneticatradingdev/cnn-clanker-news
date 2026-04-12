# CNN Brain Engine — Architecture Design

## The Vision
An AI news anchor that's ALIVE 24/7. Not a feed reader — a thinking, speaking, entertaining personality that happens to deliver crypto news.

## Core Concept: Two Loops

### Loop 1: The Scanner (Background Intelligence)
Runs continuously. Finds news. Evaluates importance.

```
┌─────────────────────────────────────────────────┐
│                   SCANNER                        │
│                                                  │
│  Sources (parallel, staggered):                  │
│  ├── RSS Feeds (CoinDesk, CT, Decrypt, etc)     │
│  ├── X/Twitter Search API (crypto keywords)      │
│  ├── X/Twitter Lists (CT influencers, devs)      │
│  ├── DexScreener API (trending tokens)           │
│  ├── CoinGecko API (price movements)             │
│  └── On-chain alerts (whale moves, launches)     │
│                                                  │
│  For each item found:                            │
│  1. Deduplicate (seen this? skip)                │
│  2. AI Evaluation: Is this newsworthy? Score 1-10│
│  3. Categorize: breaking / developing / routine  │
│  4. Queue it with priority                       │
│                                                  │
│  Output → News Queue (priority sorted)           │
└─────────────────────────────────────────────────┘
```

### Loop 2: The Anchor (Public Personality)
Runs continuously. Talks. Thinks out loud. Entertains.

```
┌─────────────────────────────────────────────────┐
│                   ANCHOR                         │
│                                                  │
│  States:                                         │
│                                                  │
│  🔴 BREAKING                                     │
│  Scanner found something score 8+                │
│  → Interrupt current segment                     │
│  → "Breaking news coming in..."                  │
│  → Deliver with urgency + analysis               │
│                                                  │
│  📰 REPORTING                                    │
│  Normal news delivery from queue                 │
│  → Pick next story from queue                    │
│  → Analyze with AI (2-3 sentences)               │
│  → Generate TTS                                  │
│  → Deliver to viewers                            │
│                                                  │
│  🧠 THINKING                                     │
│  Between stories or while scanner works          │
│  → "Let me connect some dots here..."            │
│  → "What's interesting about today's market..."  │
│  → Relate current story to previous ones         │
│  → Give market color / opinion                   │
│                                                  │
│  💬 MONOLOGUE                                    │
│  Queue is empty, filling time                    │
│  → Market commentary                             │
│  → Recap of what we've covered                   │
│  → "While we wait for new developments..."       │
│  → Crypto education moments                      │
│  → Audience engagement lines                     │
│  → Philosophical takes on crypto/tech            │
│                                                  │
│  ⏳ SCANNING                                     │
│  Visual state while scanner runs                 │
│  → "Our AI systems are scanning X right now..."  │
│  → Show scanning animation                       │
│  → Ticker keeps scrolling                        │
│                                                  │
│  Flow: REPORTING → THINKING → MONOLOGUE          │
│        ↑ BREAKING interrupts any state ↑         │
└─────────────────────────────────────────────────┘
```

## AI Brain: The Prompt Engine

The anchor's personality comes from a SYSTEM PROMPT that gives it:
- A name and persona (the CNN anchor character)
- Memory of what it's already covered this session
- Context of what the scanner has found
- Instructions on tone, pacing, personality

### Key AI Calls:

1. **Scanner Evaluation** (fast, cheap — Groq)
   - Input: raw item (tweet, RSS entry, price data)
   - Output: { newsworthy: bool, score: 1-10, category: string, summary: string }
   - Model: llama-3.3-70b-versatile

2. **Story Analysis** (medium — Groq)  
   - Input: story + context of recent coverage
   - Output: 2-3 sentence anchor analysis
   - Model: llama-3.3-70b-versatile

3. **Filler/Monologue Generation** (medium — Groq)
   - Input: what we've covered, market state, time of day
   - Output: 2-4 sentences of natural anchor dialogue
   - Model: llama-3.3-70b-versatile

4. **TTS Generation** (OpenAI)
   - Input: whatever text the anchor says
   - Output: audio buffer
   - Voice: onyx (deep, authoritative)

## State Machine

```
                    ┌──── BREAKING ←── Scanner (score 8+)
                    │         │
                    │         ▼
  START ──→ REPORTING ──→ THINKING ──→ MONOLOGUE
                ▲              │            │
                │              │            │
                └──── Queue has items ──────┘
                └──── Timer (rotate) ───────┘
```

## Data Flow

```
[Sources] → Scanner → News Queue → Anchor Brain → TTS → SSE → Viewers
                                       ↓
                                  State updates → SSE → UI updates
```

## What Viewers See

At any moment, the UI shows:
- Current anchor state (BREAKING / REPORTING / THINKING / SCANNING)
- What the anchor is saying (typewriter text)
- Audio playing (TTS)
- Ticker with recent stories
- Sidebar with story queue
- Scanner status (which sources being checked)
- "Last scanned X: 30s ago" indicators

## Technical Implementation

### Server-side (broadcast/route.ts → brain/engine.ts)
- `BrainEngine` class with state machine
- Scanner runs on intervals (RSS: 2min, X: 30s, prices: 15s)  
- Anchor loop checks queue, decides what to do next
- All state changes broadcast via SSE to connected clients

### What we need:
- X/Twitter API access (for real-time crypto tweets)
- DexScreener API (free, no key needed)  
- CoinGecko API (free tier)
- Groq API (have it ✅)
- OpenAI API (have it ✅ for TTS)

## Priority
1. First: Build the engine with RSS + filler monologues (what we can do NOW)
2. Then: Add X/Twitter scanning  
3. Then: Add DexScreener/price alerts
4. Then: Add on-chain monitoring
