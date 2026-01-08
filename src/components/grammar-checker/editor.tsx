'use client';

import { useState, useEffect } from 'react';
import { GrammarError } from '@/types/grammar';
import { useGrammarCheck } from '@/lib/hooks/use-grammar-check';
import { useGrammarStore } from '@/store/grammar-store';
import { EditorToolbar } from './editor-toolbar';
import { HighlightedText } from './highlighted-text';
import { ErrorPopover } from './error-popover';
import { ErrorLeaderboard } from './error-leaderboard';

/**
 * Main grammar checker editor component with ChatGPT-like design
 */
export function GrammarEditor() {
  const [text, setText] = useState('');
  const [selectedError, setSelectedError] = useState<{
    error: GrammarError;
    element: HTMLElement;
  } | null>(null);
  const [fixedErrors, setFixedErrors] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [lastCorrectionTime, setLastCorrectionTime] = useState(0);

  // Get provider from store
  const { provider, language, autoCheck, autoCorrect, setProvider, setAutoCorrect } = useGrammarStore();

  // Use grammar check hook
  const { errors, isLoading, metadata } = useGrammarCheck({
    text,
    provider,
    enabled: autoCheck,
    language,
  });

  // Count total checks (words)
  useEffect(() => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    setTotalChecks(words);
  }, [text]);

  // Show stats when there are errors or text
  useEffect(() => {
    setShowStats(text.length > 0);
  }, [text]);

  // Auto-correct errors when enabled (with debounce to prevent wiggle)
  useEffect(() => {
    if (!autoCorrect || errors.length === 0 || isLoading) return;

    // Prevent rapid corrections - wait at least 1 second between corrections
    const now = Date.now();
    const timeSinceLastCorrection = now - lastCorrectionTime;
    if (timeSinceLastCorrection < 1000) {
      return;
    }

    // Delay auto-correction slightly to make it smoother
    const timer = setTimeout(() => {
      const firstError = errors[0];
      if (firstError.replacements.length > 0) {
        setText(prevText => {
          const { offset, length } = firstError;
          const suggestion = firstError.replacements[0];
          return prevText.substring(0, offset) + suggestion + prevText.substring(offset + length);
        });
        setFixedErrors(prev => prev + 1);
        setLastCorrectionTime(Date.now());
      }
    }, 300); // Small delay to make correction smoother

    return () => clearTimeout(timer);
    // Only depend on errors and autoCorrect, not text (to avoid infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors, autoCorrect, isLoading]);

  // Handle error click
  const handleErrorClick = (error: GrammarError, element: HTMLElement) => {
    setSelectedError({ error, element });
    setPopoverOpen(true);
  };

  // Handle suggestion apply with autocorrect
  const handleApplySuggestion = (error: GrammarError, suggestion: string) => {
    const { offset, length } = error;
    const newText = text.substring(0, offset) + suggestion + text.substring(offset + length);
    setText(newText);
    setSelectedError(null);
    setPopoverOpen(false);
    setFixedErrors(prev => prev + 1);
  };

  // Auto-apply first suggestion (autocorrect)
  const handleAutoCorrect = (error: GrammarError) => {
    if (error.replacements.length > 0) {
      handleApplySuggestion(error, error.replacements[0]);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with title and toolbar */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold">Grammar Checker</h1>
        <p className="text-muted-foreground text-sm">
          Start typing to check your grammar in real-time
        </p>
      </div>

      {/* Compact toolbar */}
      <div className="flex items-center justify-center w-full px-4 overflow-x-auto">
        <EditorToolbar
          provider={provider}
          onProviderChange={setProvider}
          errorCount={errors.length}
          isLoading={isLoading}
          isCached={metadata?.cached}
          autoCorrect={autoCorrect}
          onAutoCorrectChange={setAutoCorrect}
        />
      </div>

      {/* Main editor area - ChatGPT style */}
      <div className="relative">
        <div className="rounded-2xl border bg-background shadow-sm hover:shadow-md transition-shadow">
          <HighlightedText
            text={text}
            errors={errors}
            onTextChange={setText}
            onErrorClick={handleErrorClick}
            className="bg-background"
          />
        </div>
      </div>

      {/* Statistics - show inline when there's content */}
      {showStats && (
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <ErrorLeaderboard
              errors={errors}
              totalChecks={totalChecks}
              fixedErrors={fixedErrors}
            />
          </div>
        </div>
      )}

      {/* Processing info */}
      {/* {metadata && !isLoading && text.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Checked in {metadata.processingTime}ms
          {metadata.cached && ' · Cached'}
        </div>
      )} */}

      {/* Error Popover */}
      {selectedError && popoverOpen && (
        <ErrorPopover
          error={selectedError.error}
          onApplySuggestion={(suggestion) =>
            handleApplySuggestion(selectedError.error, suggestion)
          }
          onAutoCorrect={() => handleAutoCorrect(selectedError.error)}
          onClose={() => {
            setPopoverOpen(false);
            setSelectedError(null);
          }}
          triggerElement={selectedError.element}
        />
      )}
    </div>
  );
}
