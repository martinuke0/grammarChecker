import { GrammarError } from '@/types/grammar';
import { createHash } from 'crypto';

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

// Cache TTL: 24 hours (in seconds)
const CACHE_TTL = 24 * 60 * 60;

/**
 * Generate a cache key from text content
 */
export function generateCacheKey(
  provider: string,
  language: string,
  text: string
): string {
  const hash = createHash('sha256')
    .update(text)
    .digest('hex')
    .substring(0, 16);

  return `grammar:${provider}:${language}:${hash}`;
}

/**
 * Get cached grammar check result
 */
export async function getCachedResult(
  key: string
): Promise<GrammarError[] | null> {
  try {
    const kvInstance = await getKV();
    if (!kvInstance) {
      return null; // KV not configured
    }
    const cached = await kvInstance.get(key) as GrammarError[] | null;
    return cached;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached grammar check result
 */
export async function setCachedResult(
  key: string,
  errors: GrammarError[],
  ttl: number = CACHE_TTL
): Promise<void> {
  try {
    const kvInstance = await getKV();
    if (!kvInstance) {
      return; // KV not configured, skip caching
    }
    await kvInstance.set(key, errors, { ex: ttl });
  } catch (error) {
    console.error('Cache set error:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Increment usage counter for a provider
 */
export async function incrementProviderUsage(
  provider: string
): Promise<void> {
  try {
    const kvInstance = await getKV();
    if (!kvInstance) {
      return; // KV not configured
    }
    const key = `usage:${provider}:count`;
    await kvInstance.incr(key);
  } catch (error) {
    console.error('Usage tracking error:', error);
  }
}

/**
 * Track unique session
 */
export async function trackSession(sessionId: string): Promise<void> {
  try {
    const kvInstance = await getKV();
    if (!kvInstance) {
      return; // KV not configured
    }
    const key = `session:${sessionId}`;
    const exists = await kvInstance.exists(key);

    if (!exists) {
      await kvInstance.set(key, Date.now(), { ex: 30 * 24 * 60 * 60 }); // 30 days
      await kvInstance.incr('sessions:total');
    }
  } catch (error) {
    console.error('Session tracking error:', error);
  }
}
