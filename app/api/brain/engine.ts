import { Scanner, type ScoredStory, type ScannerStatus } from './scanner';
import { generateDialogue, type BrainState } from './dialogue';

// ─── Fallback Stories ──────────────────────────────────────────────────────────

const FALLBACK_STORIES: ScoredStory[] = [
  { id: 'fb1', title: 'Bitcoin Surges Past Key Resistance Level as Institutional Demand Grows', summary: 'BTC rallies as major asset managers increase allocation to crypto portfolios amid favorable macro conditions.', source: 'CoinDesk', category: 'Crypto', timestamp: new Date().toISOString(), link: '#', score: 7, aiSummary: 'Bitcoin breaks resistance with strong institutional buying.', isBreaking: false },
  { id: 'fb2', title: 'Ethereum Layer 2 Ecosystem Hits Record $50B TVL', summary: 'Total value locked across Ethereum L2 networks reaches historic milestone, driven by DeFi and gaming adoption.', source: 'CoinTelegraph', category: 'DeFi', timestamp: new Date().toISOString(), link: '#', score: 6, aiSummary: 'ETH L2 TVL hits record as DeFi activity surges.', isBreaking: false },
  { id: 'fb3', title: 'Solana DEX Volume Surpasses Ethereum for Third Consecutive Week', summary: 'SOL-based decentralized exchanges continue to capture market share as low fees attract retail traders.', source: 'Decrypt', category: 'DeFi', timestamp: new Date().toISOString(), link: '#', score: 6, aiSummary: 'Solana DEX dominance continues with fee advantage.', isBreaking: false },
  { id: 'fb4', title: 'Clanker Launches New Token Factory with Advanced AI Features', summary: 'The Clanker protocol introduces autonomous token deployment powered by next-generation language models on Base.', source: 'Bankless', category: 'Web3', timestamp: new Date().toISOString(), link: '#', score: 7, aiSummary: 'Clanker expands AI token factory capabilities.', isBreaking: false },
  { id: 'fb5', title: 'SEC Approves Spot Ethereum ETF Options Trading', summary: 'Regulatory approval opens new derivatives market for institutional investors seeking ETH exposure.', source: 'CoinDesk', category: 'Regulation', timestamp: new Date().toISOString(), link: '#', score: 7, aiSummary: 'SEC green-lights ETH ETF options, unlocking institutional derivatives.', isBreaking: false },
  { id: 'fb6', title: 'Base Network Processes 10 Million Transactions in 24 Hours', summary: 'Coinbase L2 blockchain sets new throughput record as memecoin and DeFi activity surges to all-time highs.', source: 'The Block', category: 'Web3', timestamp: new Date().toISOString(), link: '#', score: 6, aiSummary: 'Base L2 sets throughput record amid activity surge.', isBreaking: false },
  { id: 'fb7', title: 'Memecoin Market Cap Reaches $100B Amid Retail Frenzy', summary: 'The memecoin sector sees explosive growth as new AI-launched tokens on Base and Solana capture viral momentum.', source: 'CoinTelegraph', category: 'Crypto', timestamp: new Date().toISOString(), link: '#', score: 7, aiSummary: 'Memecoin market crosses $100B milestone in retail surge.', isBreaking: false },
  { id: 'fb8', title: 'DeFi Protocol Reports Record $2B in Daily Trading Volume', summary: 'Automated market makers see unprecedented activity as token launches and yield farming attract capital.', source: 'Bankless', category: 'DeFi', timestamp: new Date().toISOString(), link: '#', score: 6, aiSummary: 'DeFi AMMs hit $2B daily volume record.', isBreaking: false },
];

// ─── Engine Options ────────────────────────────────────────────────────────────

export interface EngineOptions {
  broadcast: (data: object) => void;
  generateTTS: (text: string) => Promise<{ id: string; durationMs: number }>;
}

// ─── Brain Engine ──────────────────────────────────────────────────────────────

export class BrainEngine {
  private state: BrainState = 'SCANNING';
  private breakingQueue: ScoredStory[] = [];
  private storyQueue: ScoredStory[] = [];
  private covered: ScoredStory[] = [];
  private scanner: Scanner;
  private broadcast: (data: object) => void;
  private generateTTS: (text: string) => Promise<{ id: string; durationMs: number }>;
  private running = false;
  private storyCount = 0;
  private currentStory: ScoredStory | null = null;
  public currentAnchorText = '';
  public currentAudioId = '';

  constructor(opts: EngineOptions) {
    this.broadcast = opts.broadcast;
    this.generateTTS = opts.generateTTS;
    this.scanner = new Scanner();
  }

  start() {
    if (this.running) return;
    this.running = true;

    this.scanner.start(
      (story) => this.onNewStory(story),
      (status: ScannerStatus) => this.broadcast({
        type: 'scanner-status',
        scanning: status.scanning,
        lastScan: status.lastScan,
        sourcesChecked: status.sourcesChecked,
      }),
    );

    this.runLoop().catch(e => {
      console.error('[Brain] Loop crashed:', e);
      this.running = false;
    });
  }

  stop() {
    this.running = false;
    this.scanner.stop();
  }

  getCurrentState() {
    return {
      brainState: this.state,
      currentStory: this.currentStory,
      anchorText: this.currentAnchorText,
      audioId: this.currentAudioId,
      queueSize: this.breakingQueue.length + this.storyQueue.length,
      storyCount: this.storyCount,
      stories: this.getAllStoriesForTicker(),
      totalAnalyzed: this.storyCount,
      sourceCount: this.scanner.feedNames.length,
      scannerStatus: {
        scanning: this.scanner.isScanning,
        lastScan: this.scanner.lastScanAt,
        sourcesChecked: this.scanner.sourcesChecked,
      },
    };
  }

  // ── Queue Management ────────────────────────────────────────────────────────

  private onNewStory(story: ScoredStory) {
    if (this.isKnown(story.id)) return;

    if (story.isBreaking) {
      this.breakingQueue.push(story);
    } else {
      this.storyQueue.push(story);
      this.storyQueue.sort((a, b) => b.score - a.score);
      if (this.storyQueue.length > 25) {
        this.storyQueue = this.storyQueue.slice(0, 25);
      }
    }

    this.broadcast({
      type: 'ticker',
      stories: this.getAllStoriesForTicker(),
    });

    this.broadcast({
      type: 'state-change',
      state: this.state,
      queueSize: this.breakingQueue.length + this.storyQueue.length,
    });
  }

  private isKnown(id: string): boolean {
    return (
      this.covered.some(c => c.id === id) ||
      this.breakingQueue.some(b => b.id === id) ||
      this.storyQueue.some(s => s.id === id)
    );
  }

  private getAllStoriesForTicker(): ScoredStory[] {
    return [...this.breakingQueue, ...this.storyQueue, ...this.covered].slice(0, 25);
  }

  private markCovered(story: ScoredStory) {
    this.covered.unshift(story);
    if (this.covered.length > 20) this.covered = this.covered.slice(0, 20);
    this.storyCount++;
  }

  // ── State Machine ───────────────────────────────────────────────────────────

  private transitionTo(newState: BrainState) {
    this.state = newState;
    this.broadcast({
      type: 'state-change',
      state: newState,
      story: this.currentStory,
      queueSize: this.breakingQueue.length + this.storyQueue.length,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private async speakText(text: string): Promise<number> {
    this.currentAnchorText = text;
    const estimatedDuration = Math.max(8000, (text.length / 13) * 1000);

    let audioId = '';
    let durationMs = estimatedDuration;

    try {
      const tts = await this.generateTTS(text);
      audioId = tts.id;
      durationMs = tts.durationMs;
    } catch (e) {
      console.error('[Brain] TTS failed:', e);
    }

    this.currentAudioId = audioId;

    this.broadcast({
      type: 'anchor-text',
      text,
      isTyping: false,
      audioId,
    });

    return durationMs;
  }

  // ── Main Loop ───────────────────────────────────────────────────────────────

  private async runLoop() {
    // Seed queue with fallbacks so we have content immediately
    for (const story of FALLBACK_STORIES) {
      if (!this.isKnown(story.id)) {
        this.storyQueue.push(story);
      }
    }

    // Initial scanning intro
    await this.doScanning(true);

    while (this.running) {
      try {
        // 1. Breaking news takes priority
        if (this.breakingQueue.length > 0) {
          const story = this.breakingQueue.shift()!;
          await this.doBreaking(story);
          continue;
        }

        // 2. Next story from queue
        if (this.storyQueue.length > 0) {
          const story = this.storyQueue.shift()!;
          await this.doReporting(story);
          // Check for breaking after reporting
          if (this.breakingQueue.length > 0) continue;
          await this.doThinking(story);
          continue;
        }

        // 3. Queue empty — monologue then scan
        await this.doMonologue();

        // 4. Brief scanning state then loop back
        await this.doScanning(false);
      } catch (e) {
        console.error('[Brain] Loop iteration error:', e);
        await this.sleep(5000);
      }
    }
  }

  // ── State Handlers ──────────────────────────────────────────────────────────

  private async doScanning(isIntro: boolean) {
    this.transitionTo('SCANNING');

    let text: string;
    if (isIntro) {
      const hour = new Date().getHours();
      const greeting = hour < 5 ? 'Good late night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      text = `${greeting}. I am Clanker, your AI anchor for the Clanker News Network. Our systems are now scanning CoinDesk, CoinTelegraph, Decrypt, The Block, and Bankless. Stand by for live crypto coverage.`;
    } else {
      try {
        text = await generateDialogue({ state: 'SCANNING', recentlyCovered: this.covered });
      } catch {
        text = 'Our systems are monitoring the crypto feeds. Stand by for the latest developments.';
      }
    }

    const durationMs = await this.speakText(text);
    await this.sleep(durationMs + 2000);
  }

  private async doReporting(story: ScoredStory) {
    this.currentStory = story;
    this.transitionTo('REPORTING');

    // Signal thinking while generating analysis
    this.broadcast({ type: 'thinking', storyId: story.id });

    let analysis = '';
    try {
      analysis = await generateDialogue({
        state: 'REPORTING',
        currentStory: story,
        recentlyCovered: this.covered,
      });
    } catch {
      analysis = 'This development carries significant implications for the broader crypto market.';
    }

    // Build full on-air text
    const transitions = [
      'Moving on to our next story. ',
      'In other news. ',
      'Our correspondents are reporting. ',
      'Turning now. ',
      'Sources are confirming. ',
      'Up next on CNN. ',
    ];
    const prefix = this.storyCount === 0
      ? 'Let us begin our coverage. '
      : transitions[this.storyCount % transitions.length];

    const isBreakingLabel = story.isBreaking ? 'Breaking: ' : '';
    const summaryPart = story.summary && story.summary !== 'Developing story.' ? `${story.summary} ` : '';
    const ttsText = `${prefix}${isBreakingLabel}From ${story.source}. ${story.title}. ${summaryPart}${analysis} This is Clanker, reporting live.`;

    // Generate TTS + broadcast everything
    let audioId = '';
    let durationMs = Math.max(15000, (ttsText.length / 13) * 1000);
    try {
      const tts = await this.generateTTS(ttsText);
      audioId = tts.id;
      durationMs = tts.durationMs;
    } catch (e) {
      console.error('[Brain] TTS failed for reporting:', e);
    }

    this.currentAnchorText = ttsText;
    this.currentAudioId = audioId;

    this.broadcast({
      type: 'story-change',
      story,
      currentIndex: this.storyCount,
      startedAt: Date.now(),
      totalStories: this.storyCount + this.storyQueue.length + 1,
      storyCount: this.storyCount,
      analysis,
      audioId,
    });

    this.broadcast({
      type: 'anchor-text',
      text: ttsText,
      isTyping: false,
      audioId,
    });

    await this.sleep(durationMs + 4000);
    this.markCovered(story);
  }

  private async doBreaking(story: ScoredStory) {
    this.currentStory = story;
    this.transitionTo('BREAKING');

    this.broadcast({ type: 'thinking', storyId: story.id });

    // Breaking intro + analysis
    let analysis = '';
    try {
      analysis = await generateDialogue({
        state: 'REPORTING',
        currentStory: story,
        recentlyCovered: this.covered,
      });
    } catch {
      analysis = '';
    }

    const summaryPart = story.summary && story.summary !== 'Developing story.' ? `${story.summary} ` : '';
    const fullText = `Breaking news. We interrupt our coverage. From ${story.source}: ${story.title}. ${summaryPart}${analysis ? analysis + ' ' : ''}This is Clanker, reporting live.`;

    let audioId = '';
    let durationMs = Math.max(15000, (fullText.length / 13) * 1000);
    try {
      const tts = await this.generateTTS(fullText);
      audioId = tts.id;
      durationMs = tts.durationMs;
    } catch (e) {
      console.error('[Brain] TTS failed for breaking:', e);
    }

    this.currentAnchorText = fullText;
    this.currentAudioId = audioId;

    // Trigger breaking banner
    this.broadcast({ type: 'breaking', story });

    this.broadcast({
      type: 'story-change',
      story: { ...story, isBreaking: true },
      currentIndex: this.storyCount,
      startedAt: Date.now(),
      totalStories: this.storyCount + this.storyQueue.length + 1,
      storyCount: this.storyCount,
      analysis,
      audioId,
    });

    this.broadcast({
      type: 'anchor-text',
      text: fullText,
      isTyping: false,
      audioId,
    });

    await this.sleep(durationMs + 4000);
    this.markCovered(story);
  }

  private async doThinking(story: ScoredStory) {
    this.transitionTo('THINKING');

    let text = '';
    try {
      text = await generateDialogue({
        state: 'THINKING',
        currentStory: story,
        recentlyCovered: this.covered,
      });
    } catch {
      text = 'What we are seeing here connects to broader trends we have been tracking in the crypto space.';
    }

    const durationMs = await this.speakText(text);
    await this.sleep(durationMs + 2000);
  }

  private async doMonologue() {
    this.transitionTo('MONOLOGUE');

    let text = '';
    try {
      text = await generateDialogue({
        state: 'MONOLOGUE',
        recentlyCovered: this.covered,
      });
    } catch {
      text = 'While we scan for new developments, let us take stock of the broader crypto landscape. The market continues to evolve at a rapid pace, with new narratives emerging daily across DeFi, Layer 2, and the memecoin ecosystem.';
    }

    const durationMs = await this.speakText(text);
    await this.sleep(durationMs + 2000);
  }
}
