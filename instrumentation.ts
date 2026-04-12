// Next.js instrumentation hook — runs once when the server starts.
// This ensures the Brain Engine is running 24/7, even before any viewer connects.

export async function register() {
  // Only run on the Node.js server runtime (not during build, not in edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureBrainRunning } = await import('./app/api/broadcast/route');
    ensureBrainRunning();
    console.log('[CNN] Brain Engine initialized via instrumentation');
  }
}
