import { NextRequest, NextResponse } from 'next/server';
import { GrammarCheckRequest, GrammarCheckResponse } from '@/types/grammar';
import { checkWithLanguageTool } from '@/lib/grammar/languagetool';
import { checkWithOpenAI } from '@/lib/grammar/openai';
import { checkWithOpenRouter } from '@/lib/grammar/openrouter';
import {
  generateCacheKey,
  getCachedResult,
  setCachedResult,
  incrementProviderUsage,
  trackSession,
} from '@/lib/grammar/cache';

// Maximum text length (10,000 characters)
const MAX_TEXT_LENGTH = 10000;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GrammarCheckRequest = await request.json();
    const { text, provider, sessionId, language = 'en-US' } = body;

    // Validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!provider || !['languagetool', 'openai', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Track session
    if (sessionId) {
      trackSession(sessionId).catch(console.error);
    }

    // Generate cache key
    const cacheKey = generateCacheKey(provider, language, text);

    // Check cache
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      const processingTime = Date.now() - startTime;

      const response: GrammarCheckResponse = {
        errors: cachedResult,
        metadata: {
          provider,
          processingTime,
          cached: true,
          timestamp: Date.now(),
          language,
        },
      };

      return NextResponse.json(response);
    }

    // Route to appropriate provider
    let errors;
    try {
      switch (provider) {
        case 'languagetool':
          errors = await checkWithLanguageTool(text, language);
          break;
        case 'openai':
          errors = await checkWithOpenAI(text, language);
          break;
        case 'openrouter':
          errors = await checkWithOpenRouter(text, language);
          break;
        default:
          throw new Error('Invalid provider');
      }
    } catch (providerError) {
      console.error(`Provider ${provider} failed:`, providerError);
      return NextResponse.json(
        { error: `Grammar check failed: ${providerError instanceof Error ? providerError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Cache result
    setCachedResult(cacheKey, errors).catch(console.error);

    // Track usage
    incrementProviderUsage(provider).catch(console.error);

    const processingTime = Date.now() - startTime;

    const response: GrammarCheckResponse = {
      errors,
      metadata: {
        provider,
        processingTime,
        cached: false,
        timestamp: Date.now(),
        language,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Grammar check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
