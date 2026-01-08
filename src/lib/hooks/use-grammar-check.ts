'use client';

import { useEffect, useState } from 'react';
import { GrammarProvider, GrammarError, GrammarCheckResponse } from '@/types/grammar';
import { useDebounce } from './use-debounce';
import { useSession } from './use-session';

interface UseGrammarCheckOptions {
  text: string;
  provider: GrammarProvider;
  enabled?: boolean;
  language?: string;
  debounceDelay?: number;
}

interface UseGrammarCheckResult {
  errors: GrammarError[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  metadata: GrammarCheckResponse['metadata'] | null;
}

/**
 * Hook to check grammar with debouncing and caching
 */
export function useGrammarCheck({
  text,
  provider,
  enabled = true,
  language = 'en-US',
  debounceDelay = 800,
}: UseGrammarCheckOptions): UseGrammarCheckResult {
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<GrammarCheckResponse['metadata'] | null>(null);

  const sessionId = useSession();
  const debouncedText = useDebounce(text, debounceDelay);

  useEffect(() => {
    // Skip if disabled or text is too short
    if (!enabled || debouncedText.length < 3 || !sessionId) {
      setErrors([]);
      setMetadata(null);
      return;
    }

    let isCancelled = false;

    const checkGrammar = async () => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const response = await fetch('/api/grammar-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: debouncedText,
            provider,
            sessionId,
            language,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Grammar check failed');
        }

        const data: GrammarCheckResponse = await response.json();

        if (!isCancelled) {
          setErrors(data.errors);
          setMetadata(data.metadata);

          // Track analytics
          fetch('/api/analytics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              provider,
              cached: data.metadata.cached,
              timestamp: Date.now(),
              textLength: debouncedText.length,
              errorCount: data.errors.length,
            }),
          }).catch(console.error); // Don't fail if analytics fails
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Grammar check error:', err);
          setIsError(true);
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setErrors([]);
          setMetadata(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    checkGrammar();

    // Cleanup function to cancel request if component unmounts or deps change
    return () => {
      isCancelled = true;
    };
  }, [debouncedText, provider, enabled, sessionId, language]);

  return {
    errors,
    isLoading,
    isError,
    error,
    metadata,
  };
}
