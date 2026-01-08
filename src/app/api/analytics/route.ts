import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsEvent } from '@/types/grammar';

// Check if KV is configured
const isKVConfigured = () => {
  return !!(
    process.env.KV_URL &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
};

// Lazy load KV only if configured
let kv: any = null;
const getKV = async () => {
  if (!isKVConfigured()) {
    return null;
  }
  if (!kv) {
    const { kv: kvInstance } = await import('@vercel/kv');
    kv = kvInstance;
  }
  return kv;
};

export async function POST(request: NextRequest) {
  try {
    const event: AnalyticsEvent = await request.json();
    const { sessionId, provider, cached, timestamp, textLength, errorCount } = event;

    // Validation
    if (!sessionId || !provider || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store event
    try {
      const kvInstance = await getKV();
      if (!kvInstance) {
        // KV not configured, silently skip
        return NextResponse.json({ success: true, cached: false });
      }

      const eventKey = `event:${sessionId}:${timestamp}`;
      await kvInstance.set(eventKey, event, { ex: 30 * 24 * 60 * 60 }); // 30 days

      // Increment counters
      await kvInstance.incr(`provider:${provider}:total`);

      if (cached) {
        await kvInstance.incr(`provider:${provider}:cached`);
      }

      if (textLength !== undefined) {
        await kvInstance.incrby(`provider:${provider}:chars`, textLength);
      }

      if (errorCount !== undefined) {
        await kvInstance.incrby(`provider:${provider}:errors`, errorCount);
      }
    } catch (kvError) {
      console.error('Analytics storage error:', kvError);
      // Don't fail the request if analytics fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const kvInstance = await getKV();
    if (!kvInstance) {
      return NextResponse.json(
        { error: 'Analytics not configured (KV not available)' },
        { status: 503 }
      );
    }

    // Get usage statistics (optional endpoint for admin)
    const providers = ['languagetool', 'openai', 'openrouter'];
    const stats: Record<string, any> = {};

    for (const provider of providers) {
      const total = await kvInstance.get(`provider:${provider}:total`) || 0;
      const cached = await kvInstance.get(`provider:${provider}:cached`) || 0;
      const chars = await kvInstance.get(`provider:${provider}:chars`) || 0;
      const errors = await kvInstance.get(`provider:${provider}:errors`) || 0;

      stats[provider] = {
        total,
        cached,
        chars,
        errors,
      };
    }

    const totalSessions = await kvInstance.get('sessions:total') || 0;

    return NextResponse.json({
      stats,
      totalSessions,
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
